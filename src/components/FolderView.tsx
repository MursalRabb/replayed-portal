"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MnemonicEditor } from "@/components/MnemonicEditor"
import { Plus, Terminal, Edit2, Trash2 } from "lucide-react"

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

interface FolderViewProps {
  folder: Folder
  mnemonics: Mnemonic[]
  onMnemonicCreated: (mnemonic: Mnemonic) => void
  onMnemonicUpdated: (mnemonic: Mnemonic) => void
  onMnemonicDeleted: (mnemonicId: string) => void
}

export function FolderView({
  folder,
  mnemonics,
  onMnemonicCreated,
  onMnemonicUpdated,
  onMnemonicDeleted,
}: FolderViewProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingMnemonic, setEditingMnemonic] = useState<Mnemonic | null>(null)

  const handleAddMnemonic = () => {
    setEditingMnemonic(null)
    setIsEditorOpen(true)
  }

  const handleEditMnemonic = (mnemonic: Mnemonic) => {
    setEditingMnemonic(mnemonic)
    setIsEditorOpen(true)
  }

  const handleDeleteMnemonic = async (mnemonic: Mnemonic) => {
    if (!confirm(`Are you sure you want to delete the mnemonic "${mnemonic.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/mnemonics/${mnemonic._id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        onMnemonicDeleted(mnemonic._id)
      } else {
        alert(data.error || "Failed to delete mnemonic")
      }
    } catch (error) {
      console.error("Error deleting mnemonic:", error)
      alert("Failed to delete mnemonic")
    }
  }

  const handleMnemonicSaved = (mnemonic: Mnemonic) => {
    if (editingMnemonic) {
      onMnemonicUpdated(mnemonic)
    } else {
      onMnemonicCreated(mnemonic)
    }
    setIsEditorOpen(false)
    setEditingMnemonic(null)
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{folder.name}</h2>
          <p className="text-gray-600 mt-1">
            {mnemonics.length} {mnemonics.length === 1 ? "mnemonic" : "mnemonics"}
          </p>
        </div>
        <Button onClick={handleAddMnemonic}>
          <Plus className="w-4 h-4 mr-2" />
          Add Mnemonic
        </Button>
      </div>

      {/* Mnemonics Grid */}
      {mnemonics.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No mnemonics in this folder
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first command mnemonic to get started.
            </p>
            <Button onClick={handleAddMnemonic}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Mnemonic
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mnemonics.map((mnemonic) => (
            <Card key={mnemonic._id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{mnemonic.name}</CardTitle>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditMnemonic(mnemonic)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMnemonic(mnemonic)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {mnemonic.commands.length} {mnemonic.commands.length === 1 ? "command" : "commands"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mnemonic.commands.slice(0, 3).map((command, index) => (
                    <div key={index} className="bg-gray-100 rounded p-2">
                      <code className="text-sm text-gray-800">{command}</code>
                    </div>
                  ))}
                  {mnemonic.commands.length > 3 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      +{mnemonic.commands.length - 3} more commands
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mnemonic Editor */}
      {isEditorOpen && (
        <MnemonicEditor
          folder={folder}
          mnemonic={editingMnemonic}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false)
            setEditingMnemonic(null)
          }}
          onSave={handleMnemonicSaved}
        />
      )}
    </div>
  )
}
