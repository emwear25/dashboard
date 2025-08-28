<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import RegisterView from "@/views/RegisterView.vue";
import { Plus, Trash2, Settings } from "lucide-vue-next";
import { useToast } from "@/components/ui/toast/use-toast";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  userType: string;
}

const users = ref<User[]>([]);
const isLoading = ref(true);
const error = ref("");
const isUserDialogOpen = ref(false);
const isPermissionDialogOpen = ref(false);
const selectedUser = ref<User | null>(null);
const selectedUserType = ref("");
const isAdmin = ref(false);
const authStore = useAuthStore();
const { toast } = useToast();
const api = inject("api") as <T>(
  endpoint: string,
  options?: RequestInit
) => Promise<T>;

// Function to refresh the users list
const refreshUsers = async () => {
  try {
    const data = await api<User[]>("/auth/users");
    users.value = data;
  } catch (err: unknown) {
    error.value = "Failed to load users";
    console.error("Error loading users:", err);
  }
};

// Function to delete a user
const deleteUser = async (userId: string) => {
  if (
    !confirm(
      "Are you sure you want to delete this user? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    await api(`/auth/users/${userId}`, {
      method: "DELETE",
    });

    toast({
      title: "Success",
      description: "User deleted successfully",
    });

    // Refresh the users list
    await refreshUsers();
  } catch (err: unknown) {
    console.error("Error deleting user:", err);
    toast({
      title: "Error",
      description: "Failed to delete user",
    });
  }
};

// Function to open the permission dialog
const openPermissionDialog = (user: User) => {
  selectedUser.value = user;
  selectedUserType.value = user.userType || "sales_agent";
  isAdmin.value = user.isAdmin;
  isPermissionDialogOpen.value = true;
};

// Function to update user permissions
const updateUserPermissions = async () => {
  if (!selectedUser.value) return;

  try {
    interface PermissionResponse {
      message: string;
      user: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        userType: string;
        isAdmin?: boolean;
      };
    }

    // Force isAdmin to be true if the switch is checked
    const adminValue =
      document.getElementById("is-admin")?.getAttribute("aria-checked") ===
      "true";
      "Switch aria-checked value:",
      document.getElementById("is-admin")?.getAttribute("aria-checked")
    );

    // Create the request body with explicit boolean conversion
    const requestBody = {
      userType: selectedUserType.value,
      isAdmin: adminValue, // Use the direct DOM value
    };

    // Log the actual request body that will be sent

    const response = await api<PermissionResponse>(
      `/auth/users/${selectedUser.value._id}/permissions`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Log the response

    // Update the selected user with the response data
    if (response && response.user) {
      // Find and update the user in the users array
      const userIndex = users.value.findIndex(
        (u) => u._id === selectedUser.value?._id
      );
      if (userIndex !== -1) {
        users.value[userIndex] = {
          ...users.value[userIndex],
          userType: response.user.userType,
          // Always use the value we sent since the server might not return it
          isAdmin: adminValue,
        };
      }
    }

    toast({
      title: "Success",
      description: "User permissions updated successfully",
    });

    // Refresh the users list to ensure we have the latest data
    await refreshUsers();
    isPermissionDialogOpen.value = false;
  } catch (err: unknown) {
    console.error("Error updating user permissions:", err);
    toast({
      title: "Error",
      description: "Failed to update user permissions",
    });
  }
};

onMounted(async () => {
  await refreshUsers();
  isLoading.value = false;
});
</script>

<template>
  <div class="p-6">
    <div v-if="!authStore.isAdmin" class="text-center py-4 text-red-500">
      You are not authorized to view this page.
    </div>
    <template v-else>
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Users</h1>
        <Dialog v-model:open="isUserDialogOpen">
          <DialogTrigger asChild>
            <Button
              variant="default"
              class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Plus class="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <!-- Listen for the event userAdded so we can refresh the list -->
            <RegisterView inDashboard @userAdded="refreshUsers" />
          </DialogContent>
        </Dialog>
      </div>

      <div v-if="isLoading" class="text-center py-4">Loading...</div>
      <div v-else-if="error" class="text-red-500 text-center py-4">
        {{ error }}
      </div>
      <div v-else class="bg-card rounded-lg shadow">
        <table class="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Name
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Email
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                User Type
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Admin
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="user in users" :key="user._id">
              <td class="px-6 py-4 whitespace-nowrap">
                {{ user.firstName }} {{ user.lastName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {{ user.email }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="
                    user.userType === 'sales_agent'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  "
                  class="inline-block px-2 py-1 rounded text-xs font-medium"
                >
                  {{
                    user.userType === "sales_agent" ? "Sales Agent" : "Speditor"
                  }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="
                    user.isAdmin
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  "
                  class="inline-block px-2 py-1 rounded text-xs font-medium"
                >
                  {{ user.isAdmin ? "Yes" : "No" }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                  @click="openPermissionDialog(user)"
                  :disabled="user._id === authStore.user?.userId"
                >
                  <Settings class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-red-600 hover:text-red-900 hover:bg-red-50"
                  @click="deleteUser(user._id)"
                  :disabled="user._id === authStore.user?.userId"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Permission Dialog -->
      <Dialog v-model:open="isPermissionDialogOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
          </DialogHeader>
          <div v-if="selectedUser" class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="user-name">User</Label>
              <div id="user-name" class="text-sm font-medium">
                {{ selectedUser.firstName }} {{ selectedUser.lastName }} ({{
                  selectedUser.email
                }})
              </div>
            </div>

            <div class="space-y-2">
              <Label for="user-type">User Type</Label>
              <div class="flex space-x-2">
                <Button
                  variant="outline"
                  :class="
                    selectedUserType === 'sales_agent'
                      ? 'bg-blue-50 border-blue-200'
                      : ''
                  "
                  @click="selectedUserType = 'sales_agent'"
                >
                  Sales Agent
                </Button>
                <Button
                  variant="outline"
                  :class="
                    selectedUserType === 'speditor'
                      ? 'bg-purple-50 border-purple-200'
                      : ''
                  "
                  @click="selectedUserType = 'speditor'"
                >
                  Speditor
                </Button>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <Switch id="is-admin" v-model="isAdmin" />
              <Label for="is-admin">Admin Access</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="isPermissionDialogOpen = false"
              >Cancel</Button
            >
            <Button @click="updateUserPermissions">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
