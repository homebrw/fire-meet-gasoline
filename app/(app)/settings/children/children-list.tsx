"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Person } from "@/lib/types"
import { ChildCard } from "./child-card"

export function ChildrenList() {
  const [children, setChildren] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const loadChildren = async () => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: parent } = await supabase
        .from("persons")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!parent) return

      const { data: childrenData } = await supabase
        .from("persons")
        .select("*")
        .eq("parent_id", parent.id)
        .order("name")

      if (childrenData) {
        setChildren(childrenData)
      }
    } catch (error) {
      console.error("Error loading children:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      await loadChildren()
    })()
  }, [])

  useEffect(() => {
    const subscriptionRef = { current: null as unknown }

    const setupSubscription = async () => {
      try {
        const supabase = await createClient()
        subscriptionRef.current = supabase
          .channel("persons_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "persons",
            },
            () => {
              loadChildren()
            }
          )
          .subscribe()
      } catch (error) {
        console.error("Error setting up subscription:", error)
      }
    }

    setupSubscription()

    return () => {
      const sub = subscriptionRef.current as { unsubscribe?: () => void }
      sub?.unsubscribe?.()
    }
  }, [])

  if (loading) {
    return <div className="text-sm text-[var(--color-muted-foreground)]">Chargement...</div>
  }

  if (children.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Aucun enfant créé. Commencez par ajouter un enfant.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {children.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}
    </div>
  )
}
