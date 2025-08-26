"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Key, Copy, Trash2, Calendar, Clock } from "lucide-react"

interface Token {
  _id: string
  name: string
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

interface TokenWithRaw extends Token {
  token?: string
}

export function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTokenName, setNewTokenName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<TokenWithRaw | null>(null)
  const [showTokenDialog, setShowTokenDialog] = useState(false)

  const fetchTokens = async () => {
    try {
      const response = await fetch("/api/tokens")
      const data = await response.json()
      if (data.success) {
        setTokens(data.data)
      }
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTokenName.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        setNewlyCreatedToken(data.data)
        setShowTokenDialog(true)
        setNewTokenName("")
        setIsCreateOpen(false)
        fetchTokens() // Refresh the list
      } else {
        alert(data.error || "Failed to create token")
      }
    } catch (error) {
      console.error("Error creating token:", error)
      alert("Failed to create token")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteToken = async (token: Token) => {
    if (!confirm(`Are you sure you want to revoke the token "${token.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/tokens/${token._id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        fetchTokens() // Refresh the list
      } else {
        alert(data.error || "Failed to revoke token")
      }
    } catch (error) {
      console.error("Error revoking token:", error)
      alert("Failed to revoke token")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Token copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy:", error)
      alert("Failed to copy token")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CLI Authentication Tokens</h2>
          <p className="text-gray-600 mt-1">
            Manage tokens for authenticating your CLI tool with this portal
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New CLI Token</DialogTitle>
              <DialogDescription>
                Create a new authentication token for your CLI tool. Give it a descriptive name.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Token name (e.g., 'My MacBook', 'Work Laptop')"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateToken()
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
                onClick={handleCreateToken}
                disabled={!newTokenName.trim() || isLoading}
              >
                {isLoading ? "Creating..." : "Create Token"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No CLI tokens yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first authentication token to use with your CLI tool.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Token
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <Card key={token._id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Key className="w-5 h-5 mr-2 text-gray-400" />
                    {token.name}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteToken(token)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <CardDescription className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Created {formatDate(token.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {token.lastUsed && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Last used {formatDate(token.lastUsed)}
                  </div>
                )}
                {!token.lastUsed && (
                  <div className="text-sm text-gray-500">
                    Never used
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Token Display Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Token Created Successfully</DialogTitle>
            <DialogDescription>
              Your new CLI authentication token has been created. Copy it now - you won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          {newlyCreatedToken && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Name
                </label>
                <div className="bg-gray-100 rounded p-3">
                  <code className="text-sm">{newlyCreatedToken.name}</code>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Token
                </label>
                <div className="bg-gray-100 rounded p-3 flex items-center justify-between">
                  <code className="text-sm break-all mr-2">{newlyCreatedToken.token}</code>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(newlyCreatedToken.token!)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Store this token securely. You won&apos;t be able to see it again after closing this dialog.
                  Use this token in your CLI tool for authentication.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setShowTokenDialog(false)
              setNewlyCreatedToken(null)
            }}>
              I&apos;ve Saved the Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

