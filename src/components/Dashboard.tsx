"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Sidebar } from "@/components/Sidebar"
import { FolderView } from "@/components/FolderView"
import { Button } from "@/components/ui/button"
import { LogOut, User, Key } from "lucide-react"
import Link from "next/link"
import { type Command } from "@/lib/migrationHelpers"

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

export default function Dashboard() {
  const { data: session } = useSession()
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [mnemonics, setMnemonics] = useState<Mnemonic[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders")
      const data = await response.json()
      if (data.success) {
        setFolders(data.data)
        // Select first folder by default
        if (data.data.length > 0 && !selectedFolder) {
          setSelectedFolder(data.data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching folders:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMnemonics = async (folderId: string) => {
    try {
      const response = await fetch(`/api/mnemonics?folderId=${folderId}`)
      const data = await response.json()
      if (data.success) {
        setMnemonics(data.data)
      }
    } catch (error) {
      console.error("Error fetching mnemonics:", error)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      fetchMnemonics(selectedFolder._id)
    }
  }, [selectedFolder])

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolder(folder)
  }

  const handleFolderCreated = (newFolder: Folder) => {
    setFolders([newFolder, ...folders])
    setSelectedFolder(newFolder)
  }

  const handleFolderUpdated = (updatedFolder: Folder) => {
    setFolders(folders.map(f => f._id === updatedFolder._id ? updatedFolder : f))
    if (selectedFolder?._id === updatedFolder._id) {
      setSelectedFolder(updatedFolder)
    }
  }

  const handleFolderDeleted = (folderId: string) => {
    setFolders(folders.filter(f => f._id !== folderId))
    if (selectedFolder?._id === folderId) {
      const remainingFolders = folders.filter(f => f._id !== folderId)
      setSelectedFolder(remainingFolders.length > 0 ? remainingFolders[0] : null)
    }
  }

  const handleMnemonicCreated = (newMnemonic: Mnemonic) => {
    setMnemonics([newMnemonic, ...mnemonics])
  }

  const handleMnemonicUpdated = (updatedMnemonic: Mnemonic) => {
    setMnemonics(mnemonics.map(m => m._id === updatedMnemonic._id ? updatedMnemonic : m))
  }

  const handleMnemonicDeleted = (mnemonicId: string) => {
    setMnemonics(mnemonics.filter(m => m._id !== mnemonicId))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Replay Portal</h1>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/tokens">
              <Button variant="outline" size="sm">
                <Key className="w-4 h-4 mr-2" />
                CLI Tokens
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.name || session?.user?.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onFolderCreated={handleFolderCreated}
          onFolderUpdated={handleFolderUpdated}
          onFolderDeleted={handleFolderDeleted}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {selectedFolder ? (
            <FolderView
              folder={selectedFolder}
              mnemonics={mnemonics}
              onMnemonicCreated={handleMnemonicCreated}
              onMnemonicUpdated={handleMnemonicUpdated}
              onMnemonicDeleted={handleMnemonicDeleted}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-600 mb-2">
                  No folders found
                </h2>
                <p className="text-gray-500">
                  Create your first folder to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}