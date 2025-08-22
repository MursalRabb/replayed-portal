"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, X, Terminal } from "lucide-react"
import { migrateCommands, type Command } from "@/lib/migrationHelpers"

interface Folder {
  _id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

// Support both old and new mnemonic formats
interface Mnemonic {
  _id: string
  folderId: string
  name: string
  commands: Command[] | string[] // Support both formats
  createdAt: string
  updatedAt: string
}

interface MnemonicEditorProps {
  folder: Folder
  mnemonic: Mnemonic | null
  isOpen: boolean
  onClose: () => void
  onSave: (mnemonic: any) => void
}

export function MnemonicEditor({
  folder,
  mnemonic,
  isOpen,
  onClose,
  onSave,
}: MnemonicEditorProps) {
  const [name, setName] = useState("")
  const [commands, setCommands] = useState<Command[]>([{ command: "", inputs: [] }])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (mnemonic) {
      setName(mnemonic.name)
      // Migrate commands from old format to new format if needed
      const migratedCommands = migrateCommands(mnemonic.commands)
      setCommands(migratedCommands.length > 0 ? migratedCommands : [{ command: "", inputs: [] }])
    } else {
      setName("")
      setCommands([{ command: "", inputs: [] }])
    }
  }, [mnemonic])

  const handleAddCommand = () => {
    setCommands([...commands, { command: "", inputs: [] }])
  }

  const handleRemoveCommand = (index: number) => {
    if (commands.length > 1) {
      setCommands(commands.filter((_, i) => i !== index))
    }
  }

  const handleCommandChange = (index: number, value: string) => {
    const newCommands = [...commands]
    newCommands[index].command = value
    setCommands(newCommands)
  }

  const handleAddInput = (commandIndex: number) => {
    const newCommands = [...commands]
    if (!newCommands[commandIndex].inputs) {
      newCommands[commandIndex].inputs = []
    }
    newCommands[commandIndex].inputs.push("")
    setCommands(newCommands)
  }

  const handleRemoveInput = (commandIndex: number, inputIndex: number) => {
    const newCommands = [...commands]
    newCommands[commandIndex].inputs.splice(inputIndex, 1)
    setCommands(newCommands)
  }

  const handleInputChange = (commandIndex: number, inputIndex: number, value: string) => {
    const newCommands = [...commands]
    newCommands[commandIndex].inputs[inputIndex] = value
    setCommands(newCommands)
  }

  const handleSave = async () => {
    if (!name?.trim()) {
      alert("Please enter a name for the mnemonic")
      return
    }

    const filteredCommands = commands.filter(cmd => cmd?.command?.trim()?.length > 0)
    if (filteredCommands.length === 0) {
      alert("Please add at least one command")
      return
    }

    setIsLoading(true)
    try {
      const method = mnemonic ? "PUT" : "POST"
      const url = mnemonic ? `/api/mnemonics/${mnemonic._id}` : "/api/mnemonics"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: folder._id,
          name: name.trim(),
          commands: filteredCommands,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onSave(data.data)
      } else {
        alert(data.error || "Failed to save mnemonic")
      }
    } catch (error) {
      console.error("Error saving mnemonic:", error)
      alert("Failed to save mnemonic")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setCommands([{ command: "", inputs: [] }])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mnemonic ? "Edit Mnemonic" : "Create New Mnemonic"}
          </DialogTitle>
          <DialogDescription>
            {mnemonic 
              ? "Update the mnemonic name, commands, and their inputs."
              : "Create a new command mnemonic with optional saved inputs for each command."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Mnemonic Name
            </label>
            <Input
              id="name"
              placeholder="Enter mnemonic name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Commands */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Commands & Inputs
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCommand}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Command
              </Button>
            </div>
            
            <div className="space-y-6">
              {commands.map((command, commandIndex) => (
                <div key={commandIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* Command Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Terminal className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Command {commandIndex + 1}
                      </span>
                    </div>
                    {commands.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveCommand(commandIndex)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Command Input */}
                  <div className="mb-4">
                    <Input
                      placeholder="Enter command"
                      value={command?.command || ""}
                      onChange={(e) => handleCommandChange(commandIndex, e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Inputs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">
                        Saved Inputs (sent to stdin)
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddInput(commandIndex)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Input
                      </Button>
                    </div>
                    
                    {(!command?.inputs || command.inputs.length === 0) ? (
                      <div className="text-xs text-gray-500 italic py-2">
                        No saved inputs - command will run without stdin
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {command.inputs.map((input, inputIndex) => (
                          <div key={inputIndex} className="flex items-center space-x-2">
                            <div className="text-xs text-gray-500 w-8">
                              {inputIndex + 1}.
                            </div>
                            <Input
                              placeholder="Enter input value"
                              value={input}
                              onChange={(e) => handleInputChange(commandIndex, inputIndex, e.target.value)}
                              className="text-sm flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveInput(commandIndex, inputIndex)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name?.trim() || commands?.every(cmd => !cmd?.command?.trim()) || isLoading}
          >
            {isLoading ? "Saving..." : (mnemonic ? "Update" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}