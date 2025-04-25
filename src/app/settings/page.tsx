import type { Metadata } from "next"
import { UserSettingsForm } from "@/components/Usersettingform"

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your account settings and preferences.",
}

export default function SettingsPage() {
  return (
    <div className="container max-w-5xl mx-auto py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <UserSettingsForm />
      </div>
    </div>
  )
}
