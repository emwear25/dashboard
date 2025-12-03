<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle.vue";
import type { LucideIcon } from "lucide-vue-next";
import {
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
  Package,
  Boxes,
  Tags,
  ShoppingCart,
  ShoppingBag,
  Percent,
  Tag,
  TrendingUp,
  MessageSquare,
} from "lucide-vue-next";

interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  {
    name: "Табло",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Продукти",
    path: "/products",
    icon: Package,
  },
  {
    name: "Управление на Склада",
    path: "/stock",
    icon: Boxes,
  },
  {
    name: "Категории",
    path: "/categories",
    icon: Tags,
  },
  {
    name: "Отстъпки",
    path: "/discounts",
    icon: Percent,
  },
  {
    name: "Купони",
    path: "/coupons",
    icon: Tag,
  },
  {
    name: "Аналитика",
    path: "/discount-analytics",
    icon: TrendingUp,
  },
  {
    name: "Поръчки",
    path: "/orders",
    icon: ShoppingBag,
  },
  {
    name: "Външни Поръчки",
    path: "/external-orders",
    icon: ShoppingCart,
  },
  {
    name: "Контактни Съобщения",
    path: "/contact-messages",
    icon: MessageSquare,
  },
];

const brandName = "Emwear";
const userName = "Emwear Екип";
const userEmail = "team@emwear.app";

const isOpen = ref(false);
const sidebarCollapsed = ref(false);
const route = useRoute();

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const closeSheet = () => {
  isOpen.value = false;
};
</script>

<template>
  <div class="min-h-screen flex bg-background text-foreground transition-colors">
    <aside
      :class="[
        'hidden lg:flex flex-col fixed h-screen bg-card border-r border-border transition-all duration-300 z-50',
        sidebarCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <div
        :class="['p-4 flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-between']"
      >
        <h1 class="text-xl font-bold tracking-tight">
          <span v-if="!sidebarCollapsed">{{ brandName }}</span>
          <span v-else>{{ brandName.slice(0, 2).toUpperCase() }}</span>
        </h1>
        <ThemeToggle v-if="!sidebarCollapsed" />
      </div>

      <nav :class="['flex-1 space-y-1', sidebarCollapsed ? 'px-2' : 'px-4']">
        <div :class="['mb-4', sidebarCollapsed ? 'flex justify-center' : 'flex justify-end']">
          <Button
            variant="ghost"
            size="icon"
            @click="toggleSidebar"
            class="hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <PanelLeftClose v-if="!sidebarCollapsed" class="h-5 w-5 text-primary" />
            <PanelLeftOpen v-else class="h-5 w-5 text-primary" />
          </Button>
        </div>

        <RouterLink
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.path"
          :title="sidebarCollapsed ? item.name : ''"
          :class="[
            'flex items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            sidebarCollapsed ? 'justify-center px-3 py-2' : 'px-4 py-2',
            route.path === item.path ? 'bg-accent/60 text-accent-foreground' : '',
          ]"
        >
          <component :is="item.icon" :class="['h-5 w-5', sidebarCollapsed ? '' : 'mr-3']" />
          <span v-if="!sidebarCollapsed">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div
        :class="['border-t border-border', sidebarCollapsed ? 'p-2 flex justify-center' : 'p-4']"
      >
        <ThemeToggle v-if="sidebarCollapsed" />
      </div>
    </aside>

    <div
      class="flex-1 flex flex-col transition-[margin] duration-300"
      :class="sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'"
    >
      <div class="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-lg font-semibold">{{ brandName }}</span>
          <div class="flex items-center gap-2">
            <ThemeToggle />
            <Sheet v-model:open="isOpen">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu class="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" class="w-64 p-0">
                <div class="h-full flex flex-col">
                  <div class="px-6 py-4 border-b border-border">
                    <span class="text-xl font-semibold">{{ brandName }}</span>
                  </div>
                  <nav class="flex-1 px-4 py-4">
                    <RouterLink
                      v-for="item in navigationItems"
                      :key="item.name"
                      :to="item.path"
                      class="flex items-center gap-3 rounded-lg px-4 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      :class="{
                        'bg-accent/60 text-accent-foreground': route.path === item.path,
                      }"
                      @click="closeSheet"
                    >
                      <component :is="item.icon" class="h-5 w-5" />
                      <span>{{ item.name }}</span>
                    </RouterLink>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <header
        class="hidden lg:flex items-center justify-end bg-card border-b border-border px-6 py-4 sticky top-0 z-40"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" class="gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <User class="h-5 w-5 text-primary" />
              </span>
              <div class="text-left">
                <p class="text-sm font-medium leading-none">{{ userName }}</p>
                <p class="text-xs text-muted-foreground">{{ userEmail }}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem class="gap-2">
              <User class="h-4 w-4" />
              <span>Профил</span>
            </DropdownMenuItem>
            <DropdownMenuItem class="gap-2">
              <Settings class="h-4 w-4" />
              <span>Настройки</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main class="flex-1 lg:pt-0 pt-16 px-4 md:px-6 lg:px-8 py-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
