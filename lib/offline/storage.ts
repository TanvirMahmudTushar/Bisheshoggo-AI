"use client"

import CryptoJS from "crypto-js"

const ENCRYPTION_KEY = "ShusthoBondhu_2025_SecureKey"
const STORAGE_PREFIX = "sb_"

export interface StorageData {
  timestamp: number
  synced: boolean
  data: any
}

class OfflineStorage {
  private getEncryptionKey(): string {
    if (typeof window !== "undefined") {
      const existing = localStorage.getItem("sb_device_key")
      if (existing) {
        return existing
      }
      const newKey = CryptoJS.lib.WordArray.random(32).toString()
      localStorage.setItem("sb_device_key", newKey)
      return newKey
    }
    return ENCRYPTION_KEY
  }

  encrypt(data: any): string {
    const key = this.getEncryptionKey()
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString()
  }

  decrypt(encryptedData: string): any {
    try {
      const key = this.getEncryptionKey()
      const bytes = CryptoJS.AES.decrypt(encryptedData, key)
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    } catch {
      return null
    }
  }

  set(key: string, value: any, synced = false): void {
    if (typeof window === "undefined") return

    const storageData: StorageData = {
      timestamp: Date.now(),
      synced,
      data: value,
    }

    const encrypted = this.encrypt(storageData)
    localStorage.setItem(STORAGE_PREFIX + key, encrypted)
  }

  get(key: string): any {
    if (typeof window === "undefined") return null

    const encrypted = localStorage.getItem(STORAGE_PREFIX + key)
    if (!encrypted) return null

    const storageData = this.decrypt(encrypted) as StorageData
    return storageData?.data
  }

  getAll(prefix: string): any[] {
    if (typeof window === "undefined") return []

    const items: any[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX + prefix)) {
        const data = this.get(key.replace(STORAGE_PREFIX, ""))
        if (data) items.push(data)
      }
    }
    return items
  }

  remove(key: string): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_PREFIX + key)
  }

  clear(): void {
    if (typeof window === "undefined") return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key)
      }
    }
    keys.forEach((key) => localStorage.removeItem(key))
  }

  getUnsyncedItems(): Array<{ key: string; data: any }> {
    if (typeof window === "undefined") return []

    const unsynced: Array<{ key: string; data: any }> = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const encrypted = localStorage.getItem(key)
        if (encrypted) {
          const storageData = this.decrypt(encrypted) as StorageData
          if (storageData && !storageData.synced) {
            unsynced.push({
              key: key.replace(STORAGE_PREFIX, ""),
              data: storageData.data,
            })
          }
        }
      }
    }
    return unsynced
  }

  markAsSynced(key: string): void {
    const data = this.get(key)
    if (data) {
      this.set(key, data, true)
    }
  }
}

export const offlineStorage = new OfflineStorage()
