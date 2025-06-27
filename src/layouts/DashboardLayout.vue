<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-vue-next";
import {
  Menu,
  Sun,
  Moon,
  Lock,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  User,
  Users,
  Calendar,
  CalendarDays,
} from "lucide-vue-next";
import { ref, onMounted, computed } from "vue";
import { useDark, useToggle } from "@vueuse/core";
import { RouterLink, RouterView } from "vue-router";
import { ToastProvider, Toast } from "@/components/ui/toast";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useRouter } from "vue-router";

interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  locked?: boolean;
  children?: NavigationItem[];
}

const isOpen = ref(false);
const isDark = useDark();
const toggleDark = useToggle(isDark);

const router = useRouter();
const { doctor, isAuthenticated, logout, initialize } = useDoctorAuth();

// Computed property for user's full name
const userFullName = computed(() => {
  if (doctor.value?.name) {
    return doctor.value.name;
  } else {
    return doctor.value?.email || "Doctor";
  }
});

const navigationItems = computed<NavigationItem[]>(() => {
  const items: NavigationItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "My Profile", path: "/profile", icon: User },
    { name: "My Availability", path: "/availability", icon: Calendar },
    { name: "My Appointments", path: "/appointments", icon: CalendarDays },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  // Add admin-only items
  if (doctor.value?.isAdmin) {
    items.splice(2, 0, { name: "Doctors", path: "/doctors", icon: Users });
  }

  return items;
});

const expandedItems = ref<string[]>([]);

const toggleExpand = (itemName: string) => {
  const index = expandedItems.value.indexOf(itemName);
  if (index === -1) {
    expandedItems.value.push(itemName);
  } else {
    expandedItems.value.splice(index, 1);
  }
};

const handleLogout = async () => {
  await logout();
};

onMounted(async () => {
  // Make sure doctor auth is initialized
  if (!isAuthenticated.value) {
    const initialized = await initialize();
    if (!initialized) {
      router.push("/login");
    }
  }
});
</script>

<template>
  <ToastProvider>
    <Toast />
    <div class="min-h-screen flex bg-background dark:bg-slate-950">
      <!-- Desktop Sidebar -->
      <aside
        class="hidden lg:flex w-64 flex-col fixed h-screen bg-card dark:bg-slate-900 border-r border-border"
      >
        <div class="p-6 flex justify-between items-center">
          <h1 class="text-2xl font-bold">Telemediker</h1>
          <Button variant="ghost" size="icon" @click="toggleDark()">
            <Sun v-if="isDark" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
          </Button>
        </div>
        <nav class="flex-1 px-4">
          <template v-for="item in navigationItems" :key="item.name">
            <!-- Regular menu item without children -->
            <RouterLink
              v-if="!item.children"
              :to="item.path"
              class="flex items-center px-4 py-2 mt-2 text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              :class="{
                'bg-accent/50 text-accent-foreground':
                  $route.path === item.path,
                'opacity-50 cursor-not-allowed': item.locked,
              }"
              @click.prevent="$router.push(item.path)"
            >
              <component :is="item.icon" class="h-5 w-5 mr-3" />
              <span>{{ item.name }}</span>
              <Lock
                v-if="item.locked"
                class="h-4 w-4 ml-auto text-muted-foreground"
              />
            </RouterLink>

            <!-- Menu item with children -->
            <div v-else class="mt-2">
              <Button
                variant="ghost"
                class="w-full justify-start px-4 py-2 text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                @click="toggleExpand(item.name)"
              >
                <component :is="item.icon" class="h-5 w-5 mr-3" />
                <span>{{ item.name }}</span>
                <ChevronDown
                  class="ml-auto h-4 w-4 transition-transform"
                  :class="{
                    'rotate-180': expandedItems.includes(item.name),
                  }"
                />
              </Button>
              <div
                v-if="expandedItems.includes(item.name)"
                class="ml-8 mt-1 space-y-1"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.name"
                  :to="child.path"
                  class="flex items-center px-4 py-2 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                  :class="{
                    'bg-accent/50 text-accent-foreground':
                      $route.path === child.path,
                    'opacity-50 cursor-not-allowed': child.locked,
                  }"
                  @click.prevent="$router.push(child.path)"
                >
                  <component :is="child.icon" class="h-4 w-4 mr-3" />
                  <span>{{ child.name }}</span>
                  <Lock
                    v-if="child.locked"
                    class="h-3 w-3 ml-auto text-muted-foreground"
                  />
                </RouterLink>
              </div>
            </div>
          </template>
        </nav>
        <div class="p-4 border-t border-border">
          <Button
            variant="ghost"
            class="w-full justify-start"
            size="sm"
            @click="handleLogout"
          >
            <LogOut class="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <!-- Mobile Header -->
      <div
        class="lg:hidden fixed w-full bg-card dark:bg-slate-900 border-b border-border z-50"
      >
        <div class="flex items-center justify-between p-4">
          <h1 class="text-xl font-bold">Telemediker</h1>
          <div class="flex items-center gap-4">
            <!-- User Avatar -->
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  class="rounded-full flex items-center gap-2 px-2"
                >
                  <div
                    class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden"
                  >
                    <img
                      v-if="doctor?.photoUrl"
                      :src="doctor.photoUrl"
                      alt="Profile"
                      class="h-full w-full object-cover"
                    />
                    <User v-else class="h-5 w-5" />
                  </div>
                  <span class="hidden md:inline-block">{{ userFullName }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div class="p-2 border-b border-border">
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        v-if="doctor?.photoUrl"
                        :src="doctor.photoUrl"
                        alt="Profile"
                        class="h-full w-full object-cover"
                      />
                      <User v-else class="h-6 w-6" />
                    </div>
                    <div>
                      <p class="font-medium">{{ userFullName }}</p>
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-muted-foreground">
                          Doctor
                        </span>
                        <span
                          v-if="doctor?.isAdmin"
                          class="text-sm text-muted-foreground"
                        >
                          (Admin)
                        </span>
                      </div>
                      <p class="text-xs text-muted-foreground">
                        {{ doctor?.email || "" }}
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <RouterLink to="/settings" class="cursor-pointer"
                    >Profile</RouterLink
                  >
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <RouterLink to="/calendar" class="cursor-pointer"
                    >Calendar</RouterLink
                  >
                </DropdownMenuItem>
                <DropdownMenuItem
                  @click="handleLogout"
                  class="cursor-pointer text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" @click="toggleDark()">
              <Sun v-if="isDark" class="h-5 w-5" />
              <Moon v-else class="h-5 w-5" />
            </Button>

            <!-- Mobile Menu -->
            <Sheet v-model:open="isOpen">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu class="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" class="w-64 p-0">
                <div class="h-full flex flex-col">
                  <div class="p-6 border-b border-border">
                    <h1 class="text-2xl font-bold">Telemediker</h1>
                  </div>
                  <nav class="flex-1 px-4 py-4">
                    <template v-for="item in navigationItems" :key="item.name">
                      <!-- Regular menu item without children -->
                      <RouterLink
                        v-if="!item.children"
                        :to="item.path"
                        class="flex items-center px-4 py-2 mt-2 text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                        :class="{
                          'bg-accent/50 text-accent-foreground':
                            $route.path === item.path,
                          'opacity-50 cursor-not-allowed': item.locked,
                        }"
                        @click="isOpen = false"
                      >
                        <component :is="item.icon" class="h-5 w-5 mr-3" />
                        <span>{{ item.name }}</span>
                        <Lock
                          v-if="item.locked"
                          class="h-4 w-4 ml-auto text-muted-foreground"
                        />
                      </RouterLink>

                      <!-- Menu item with children -->
                      <div v-else class="mt-2">
                        <Button
                          variant="ghost"
                          class="w-full justify-start px-4 py-2 text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                          @click="toggleExpand(item.name)"
                        >
                          <component :is="item.icon" class="h-5 w-5 mr-3" />
                          <span>{{ item.name }}</span>
                          <ChevronDown
                            class="ml-auto h-4 w-4 transition-transform"
                            :class="{
                              'rotate-180': expandedItems.includes(item.name),
                            }"
                          />
                        </Button>
                        <div
                          v-if="expandedItems.includes(item.name)"
                          class="ml-8 mt-1 space-y-1"
                        >
                          <RouterLink
                            v-for="child in item.children"
                            :key="child.name"
                            :to="child.path"
                            class="flex items-center px-4 py-2 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                            :class="{
                              'bg-accent/50 text-accent-foreground':
                                $route.path === child.path,
                              'opacity-50 cursor-not-allowed': child.locked,
                            }"
                            @click="isOpen = false"
                          >
                            <component :is="child.icon" class="h-4 w-4 mr-3" />
                            <span>{{ child.name }}</span>
                            <Lock
                              v-if="child.locked"
                              class="h-3 w-3 ml-auto text-muted-foreground"
                            />
                          </RouterLink>
                        </div>
                      </div>
                    </template>
                  </nav>
                  <div class="p-4 border-t border-border">
                    <Button
                      variant="ghost"
                      class="w-full justify-start"
                      size="sm"
                      @click="handleLogout"
                    >
                      <LogOut class="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="flex-1 lg:ml-64 lg:pt-0 pt-16">
        <!-- Desktop Header -->
        <header
          class="hidden lg:flex bg-card dark:bg-slate-900 border-b border-border px-6 py-4 sticky top-0 z-40"
        >
          <div class="flex items-center justify-between w-full">
            <!-- Doctor Info -->
            <div class="flex items-center gap-4">
              <div
                class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-border"
              >
                <img
                  v-if="doctor?.photoUrl"
                  :src="doctor.photoUrl"
                  alt="Profile"
                  class="h-full w-full object-cover"
                />
                <User v-else class="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-foreground">
                  Dr. {{ userFullName }}
                </h2>
                <div
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span>{{
                    doctor?.specialties?.join(", ") || "General Practice"
                  }}</span>
                  <span
                    v-if="doctor?.isAdmin"
                    class="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    Admin
                  </span>
                </div>
              </div>
            </div>

            <!-- Right Side Actions -->
            <div class="flex items-center gap-3">
              <!-- Theme Toggle -->
              <Button variant="ghost" size="icon" @click="toggleDark()">
                <Sun v-if="isDark" class="h-5 w-5" />
                <Moon v-else class="h-5 w-5" />
              </Button>

              <!-- User Dropdown -->
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" class="gap-2">
                    <ChevronDown class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-56">
                  <div class="p-2 border-b border-border">
                    <p class="font-medium">Dr. {{ userFullName }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ doctor?.email }}
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/profile" class="cursor-pointer">
                      <User class="mr-2 h-4 w-4" />
                      My Profile
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/calendar" class="cursor-pointer">
                      <Calendar class="mr-2 h-4 w-4" />
                      Calendar
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    @click="handleLogout"
                    class="cursor-pointer text-destructive"
                  >
                    <LogOut class="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <!-- Content Area -->
        <div class="lg:pt-0">
          <RouterView />
        </div>
      </main>
    </div>
  </ToastProvider>
</template>

<style>
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
</style>
