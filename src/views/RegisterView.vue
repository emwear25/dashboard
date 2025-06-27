<script setup lang="ts">
import { useForm, type SubmissionHandler } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ref } from "vue";
import { Switch } from "@/components/ui/switch";

import { createCustomFetch } from "@/plugins/api";

// Add event emitter to notify parent when a user is added
const emit = defineEmits(["userAdded"]);

// Define response type
interface RegisterResponse {
  content: string;
}

// Define error type
interface ApiError {
  status: number;
  data: {
    content?: string;
  };
}

// Define form values type
interface FormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: "sales_agent" | "speditor";
  isAdmin: boolean;
}

const formSchema = toTypedSchema(
  z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    userType: z.enum(["sales_agent", "speditor"], {
      required_error: "Please select a user type",
    }),
    isAdmin: z.boolean().default(false),
  })
);

// Form state
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Or use direct import if preferred
const api = createCustomFetch();

// Form setup
const form = useForm<FormValues>({
  validationSchema: formSchema,
  initialValues: {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    userType: "sales_agent", // Default user type
    isAdmin: false,
  },
});

// Add prop to determine if the form is being used in the dashboard
const props = defineProps({
  inDashboard: {
    type: Boolean,
    default: false,
  },
});

// Submit handler
const onSubmit: SubmissionHandler<FormValues> = async (values) => {
  try {
    errorMessage.value = "";
    successMessage.value = "";
    isSubmitting.value = true;

    const response = await api<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
    });

    successMessage.value = response.content;
    form.resetForm();

    if (props.inDashboard) {
      emit("userAdded");
    }
  } catch (error: unknown) {
    console.log("Registration error:", error); // Debug log

    // Handle different types of errors
    const apiError = error as ApiError;
    if (apiError.status === 403) {
      errorMessage.value =
        apiError.data?.content || "Only administrators can register new users";
    } else if (apiError.status === 400) {
      errorMessage.value = apiError.data?.content || "Email is already taken";
    } else if (apiError.status === 401) {
      errorMessage.value =
        apiError.data?.content || "You must be logged in as an admin";
    } else {
      errorMessage.value =
        apiError.data?.content ||
        "An error occurred during registration. Please try again.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center',
      !inDashboard ? 'min-h-screen bg-background' : '',
    ]"
  >
    <div class="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-sm">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-foreground">
          {{ inDashboard ? "Add New User" : "Create Account" }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{
            inDashboard
              ? "Add a new user to the system"
              : "Register a new account"
          }}
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong class="font-bold">Error: </strong>
        <span class="block sm:inline">{{ errorMessage }}</span>
      </div>

      <!-- Success Message -->
      <div
        v-if="successMessage"
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong class="font-bold">Success: </strong>
        <span class="block sm:inline">{{ successMessage }}</span>
      </div>

      <Form @submit="onSubmit" class="mt-8 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <FormField v-slot="{ field }" name="firstName">
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input v-bind="field" placeholder="Enter first name" required />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ field }" name="lastName">
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input v-bind="field" placeholder="Enter last name" required />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <FormField v-slot="{ field }" name="email">
          <FormItem>
            <FormLabel>Email address</FormLabel>
            <FormControl>
              <Input
                v-bind="field"
                type="email"
                placeholder="Enter your email"
                required
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ field }" name="password">
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input
                v-bind="field"
                type="password"
                placeholder="Enter your password"
                required
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="inDashboard" v-slot="{ field }" name="userType">
          <FormItem>
            <FormLabel>User Type</FormLabel>
            <FormControl>
              <select
                v-bind="field"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="sales_agent">Sales Agent</option>
                <option value="speditor">Speditor</option>
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="inDashboard" v-slot="{ field }" name="isAdmin">
          <FormItem
            class="flex flex-row items-center justify-between rounded-lg border p-4"
          >
            <div class="space-y-0.5">
              <FormLabel>Admin Access</FormLabel>
              <div class="text-sm text-muted-foreground">
                Grant administrator privileges to this user
              </div>
            </div>
            <FormControl>
              <Switch
                v-bind="field"
                :checked="field.value"
                @update:checked="field.value = $event"
              />
            </FormControl>
          </FormItem>
        </FormField>

        <Button
          type="submit"
          class="w-full flex justify-center"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? "Creating Account..." : "Create Account" }}
        </Button>
      </Form>
    </div>
  </div>
</template>
