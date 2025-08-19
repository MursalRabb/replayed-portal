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
import { Plus, X } from "lucide-react"

interface Folder {
  _id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface Mnemonic {
  _id: string
  folderId: string
  name: string
  commands: string[]
  createdAt: string
  updatedAt: string
}

interface MnemonicEditorProps {
  folder: Folder
  mnemonic: Mnemonic | null
  isOpen: boolean
  onClose: () => void
  onSave: (mnemonic: Mnemonic) => void
}

export function MnemonicEditor({
  folder,
  mnemonic,
  isOpen,
  onClose,
  onSave,
}: MnemonicEditorProps) {
  const [name, setName] = useState("")
  const [commands, setCommands] = useState<string[]>([""])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (mnemonic) {
      setName(mnemonic.name)
      setCommands(mnemonic.commands.length > 0 ? mnemonic.commands : [""])
    } else {
      setName("")
      setCommands([""])
    }
  }, [mnemonic])

  const handleAddCommand = () => {
    setCommands([...commands, ""])
  }

  const handleRemoveCommand = (index: number) => {
    if (commands.length > 1) {
      setCommands(commands.filter((_, i) => i !== index))
    }
  }

  const handleCommandChange = (index: number, value: string) => {
    const newCommands = [...commands]
    newCommands[index] = value
    setCommands(newCommands)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a name for the mnemonic")
      return
    }

    const filteredCommands = commands.filter(cmd => cmd.trim().length > 0)
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
    setCommands([""])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mnemonic ? "Edit Mnemonic" : "Create New Mnemonic"}
          </DialogTitle>
          <DialogDescription>
            {mnemonic 
              ? "Update the mnemonic name and commands."
              : "Create a new command mnemonic in this folder."
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
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Commands
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
            
            <div className="space-y-3">
              {commands.map((command, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Enter command"
                    value={command}
                    onChange={(e) => handleCommandChange(index, e.target.value)}
                    className="font-mono text-sm"
                  />
                  {commands.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveCommand(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
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
            disabled={!name.trim() || commands.every(cmd => !cmd.trim()) || isLoading}
          >
            {isLoading ? "Saving..." : (mnemonic ? "Update" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
