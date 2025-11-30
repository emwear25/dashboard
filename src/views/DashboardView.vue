<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stats = [
  {
    title: "Active Projects",
    value: "4",
    description: "Two new initiatives launched this week.",
  },
  {
    title: "Design Tokens",
    value: "12",
    description: "Shared across web and mobile clients.",
  },
  {
    title: "Team Members",
    value: "18",
    description: "Invites pending for 3 collaborators.",
  },
];

const updates = [
  {
    title: "Refresh onboarding flow",
    status: "In progress",
    tag: "Design",
  },
  {
    title: "Audit component accessibility",
    status: "Planned",
    tag: "UI",
  },
  {
    title: "Ship analytics prototype",
    status: "Review",
    tag: "Product",
  },
];
</script>

<template>
  <div class="space-y-8">
    <div
      class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">Emwear Overview</h2>
        <p class="text-muted-foreground">
          Kickstart your dashboard by mixing and matching ShadCN components.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline">Share</Button>
        <Button>Create New</Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card v-for="item in stats" :key="item.title">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ item.title }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-semibold">{{ item.value }}</div>
          <CardDescription class="mt-2">
            {{ item.description }}
          </CardDescription>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Team Snapshot</CardTitle>
        <CardDescription>
          Use tabs to quickly scaffold dashboard sections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs default-value="activity" class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" class="mt-6 space-y-4">
            <div class="rounded-lg border border-border p-4">
              <p class="text-sm text-muted-foreground">
                Plug your analytics providers or charts into this empty state.
                Everything is ready for Tailwind + ShadCN theming out of the
                box.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="updates" class="mt-6 space-y-4">
            <div
              v-for="update in updates"
              :key="update.title"
              class="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p class="font-medium">{{ update.title }}</p>
                <p class="text-sm text-muted-foreground">
                  Status: {{ update.status }}
                </p>
              </div>
              <Badge variant="secondary">{{ update.tag }}</Badge>
            </div>
          </TabsContent>
          <TabsContent value="resources" class="mt-6 space-y-4">
            <div
              class="rounded-lg border border-dashed border-border p-6 text-center"
            >
              <p class="text-sm text-muted-foreground">
                Drop in links to your style guide, product specs, or component
                docs.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template>
