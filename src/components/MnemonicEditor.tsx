"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, X, Terminal, Type, CornerDownLeft, Keyboard } from "lucide-react"
import { InputStep, MnemonicCommand, INPUT_TYPE_OPTIONS, KEY_OPTIONS } from "@/types/mnemonic"

interface Folder {
  _id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface Mnemonic {
  _id: string
  userId: string
  folderId?: string | null
  name: string
  commands: MnemonicCommand[]
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
  const [commands, setCommands] = useState<MnemonicCommand[]>([{ command: "", inputs: [] }])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (mnemonic) {
      setName(mnemonic.name)
      setCommands(mnemonic.commands.length > 0 ? mnemonic.commands : [{ command: "", inputs: [] }])
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
    newCommands[commandIndex].inputs.push({ type: "text", value: "" })
    setCommands(newCommands)
  }

  const handleRemoveInput = (commandIndex: number, inputIndex: number) => {
    const newCommands = [...commands]
    newCommands[commandIndex].inputs.splice(inputIndex, 1)
    setCommands(newCommands)
  }

  const handleInputStepChange = (commandIndex: number, inputIndex: number, step: InputStep) => {
    const newCommands = [...commands]
    newCommands[commandIndex].inputs[inputIndex] = step
    setCommands(newCommands)
  }

  const handleInputTypeChange = (commandIndex: number, inputIndex: number, type: string) => {
    const newCommands = [...commands]
    const currentStep = newCommands[commandIndex].inputs[inputIndex]
    
    if (type === "text") {
      newCommands[commandIndex].inputs[inputIndex] = { type: "text", value: currentStep.type === "text" ? currentStep.value : "" }
    } else if (type === "enter") {
      newCommands[commandIndex].inputs[inputIndex] = { type: "enter" }
    } else if (type === "key") {
      newCommands[commandIndex].inputs[inputIndex] = { type: "key", key: "up" }
    }
    
    setCommands(newCommands)
  }

  const handleTextValueChange = (commandIndex: number, inputIndex: number, value: string) => {
    const newCommands = [...commands]
    const step = newCommands[commandIndex].inputs[inputIndex]
    if (step.type === "text") {
      newCommands[commandIndex].inputs[inputIndex] = { type: "text", value }
      setCommands(newCommands)
    }
  }

  const handleKeyValueChange = (commandIndex: number, inputIndex: number, key: string) => {
    const newCommands = [...commands]
    const step = newCommands[commandIndex].inputs[inputIndex]
    if (step.type === "key") {
      newCommands[commandIndex].inputs[inputIndex] = { type: "key", key: key as any }
      setCommands(newCommands)
    }
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

  const getInputStepIcon = (step: InputStep) => {
    switch (step.type) {
      case "text":
        return <Type className="w-3 h-3" />
      case "enter":
        return <CornerDownLeft className="w-3 h-3" />
      case "key":
        return <Keyboard className="w-3 h-3" />
    }
  }

  const getInputStepDescription = (step: InputStep) => {
    switch (step.type) {
      case "text":
        return `Type: "${step.value}"`
      case "enter":
        return "Press Enter"
      case "key":
        return `Press ${KEY_OPTIONS.find(k => k.value === step.key)?.label || step.key}`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mnemonic ? "Edit Mnemonic" : "Create New Mnemonic"}
          </DialogTitle>
          <DialogDescription>
            {mnemonic 
              ? "Update the mnemonic name, commands, and their input steps."
              : "Create a new command mnemonic with step-by-step inputs."
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
                Commands & Input Steps
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
                  <div className="flex items-center justify-between mb-4">
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

                  {/* Input Steps Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Inputs to Send (in order)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Text is typed literally (no Enter). Add a separate Enter step if needed. Use Key for arrow/space/tab/backspace.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddInput(commandIndex)}
                        className="text-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Input
                      </Button>
                    </div>
                    
                    {command.inputs.length === 0 ? (
                      <div className="text-xs text-gray-500 italic py-3 text-center border border-dashed rounded">
                        No input steps - command will run without any input
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {command.inputs.map((input, inputIndex) => (
                          <div key={inputIndex} className="bg-white border rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                                {inputIndex + 1}
                              </div>
                              
                              <div className="flex-1 space-y-2">
                                {/* Step Type Selector */}
                                <div className="flex items-center gap-2">
                                  {getInputStepIcon(input)}
                                  <Select
                                    value={input.type}
                                    onValueChange={(value) => handleInputTypeChange(commandIndex, inputIndex, value)}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {INPUT_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <span className="text-xs text-gray-500">
                                    {getInputStepDescription(input)}
                                  </span>
                                </div>

                                {/* Step Value Input */}
                                {input.type === "text" && (
                                  <Input
                                    placeholder="Enter text to type"
                                    value={input.value}
                                    onChange={(e) => handleTextValueChange(commandIndex, inputIndex, e.target.value)}
                                    className="text-sm"
                                  />
                                )}

                                {input.type === "key" && (
                                  <Select
                                    value={input.key}
                                    onValueChange={(value) => handleKeyValueChange(commandIndex, inputIndex, value)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {KEY_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>

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