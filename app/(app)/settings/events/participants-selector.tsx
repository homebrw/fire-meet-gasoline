"use client"

import { useState, useEffect } from "react"
import { Person } from "@/lib/types"
import { Card } from "@/components/ui/card"

interface ParticipantsSelectorProps {
  parents: Person[]
  childPersonList: Person[]
  defaultParticipants?: string[]
  onChange: (participantIds: string[]) => void
}

export function ParticipantsSelector({
  parents,
  childPersonList,
  defaultParticipants = [],
  onChange,
}: ParticipantsSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultParticipants)
  )

  useEffect(() => {
    onChange(Array.from(selected))
  }, [selected, onChange])

  const handleToggle = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  return (
    <div className="space-y-3">
      {parents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Parents
          </p>
          <Card className="p-3 space-y-2">
            {parents.map((parent) => (
              <label
                key={parent.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(parent.id)}
                  onChange={() => handleToggle(parent.id)}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: parent.color }}
                  />
                  <span className="text-sm">{parent.name}</span>
                </div>
              </label>
            ))}
          </Card>
        </div>
      )}

      {childPersonList.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enfants
          </p>
          <Card className="p-3 space-y-2">
            {childPersonList.map((child) => (
              <label
                key={child.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(child.id)}
                  onChange={() => handleToggle(child.id)}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: child.color }}
                  />
                  <span className="text-sm">{child.name}</span>
                </div>
              </label>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
