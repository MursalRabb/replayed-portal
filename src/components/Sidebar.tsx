"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Folder, Plus, Edit2, Trash2 } from "lucide-react"

interface Folder {
  _id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  folders: Folder[]
  selectedFolder: Folder | null
  onFolderSelect: (folder: Folder) => void
  onFolderCreated: (folder: Folder) => void
  onFolderUpdated: (folder: Folder) => void
  onFolderDeleted: (folderId: string) => void
}

export function Sidebar({
  folders,
  selectedFolder,
  onFolderSelect,
  onFolderCreated,
  onFolderUpdated,
  onFolderDeleted,
}: SidebarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [editFolderName, setEditFolderName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        onFolderCreated(data.data)
        setNewFolderName("")
        setIsCreateOpen(false)
      } else {
        alert(data.error || "Failed to create folder")
      }
    } catch (error) {
      console.error("Error creating folder:", error)
      alert("Failed to create folder")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/folders/${editingFolder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editFolderName.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        onFolderUpdated(data.data)
        setEditingFolder(null)
        setEditFolderName("")
        setIsEditOpen(false)
      } else {
        alert(data.error || "Failed to update folder")
      }
    } catch (error) {
      console.error("Error updating folder:", error)
      alert("Failed to update folder")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteFolder = async (folder: Folder) => {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? This will also delete all mnemonics in this folder.`)) {
      return
    }

    try {
      const response = await fetch(`/api/folders/${folder._id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        onFolderDeleted(folder._id)
      } else {
        alert(data.error || "Failed to delete folder")
      }
    } catch (error) {
      console.error("Error deleting folder:", error)
      alert("Failed to delete folder")
    }
  }

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder)
    setEditFolderName(folder.name)
    setIsEditOpen(true)
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for your new folder.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder()
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isLoading}
                >
                  {isLoading ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No folders yet</p>
            <p className="text-sm">Create your first folder to get started</p>
          </div>
        ) : (
          folders.map((folder) => (
            <div
              key={folder._id}
              className={`group flex items-center justify-between p-3 m-2 rounded-lg cursor-pointer transition-colors ${
                selectedFolder?._id === folder._id
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onFolderSelect(folder)}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {folder.name}
                </span>
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditDialog(folder)
                  }}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFolder(folder)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update the folder name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditFolder()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={!editFolderName.trim() || isLoading}
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
