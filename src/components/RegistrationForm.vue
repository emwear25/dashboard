<script setup lang="ts">
import { useForm } from "vee-validate";
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
  FormSelect,
  FormSelectTrigger,
  FormSelectValue,
  FormSelectContent,
  FormSelectItem,
} from "@/components/ui/form";
import { ref } from "vue";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const formSchema = toTypedSchema(
  z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    permission: z.enum(["admin", "level1", "level2"], {
      required_error: "Please select a permission level",
    }),
  })
);

// Form state
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Form setup
const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    permission: "level1", // default value
  },
});

// Submit handler
const onSubmit = async (values: any) => {
  try {
    errorMessage.value = "";
    successMessage.value = "";
    isSubmitting.value = true;

    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();

    if (!response.ok) {
      errorMessage.value = data.content;
      return;
    }

    successMessage.value = data.content;
    form.resetForm();
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : "An unknown error occurred";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
    <div class="text-center">
      <h2 class="mt-6 text-3xl font-bold text-gray-900">Create Account</h2>
      <p class="mt-2 text-sm text-gray-600">Register a new account</p>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
      role="alert"
    >
      <span class="block sm:inline">{{ errorMessage }}</span>
    </div>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
      role="alert"
    >
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

      <FormField v-slot="{ field }" name="permission">
        <FormItem>
          <FormLabel>Permission Level</FormLabel>
          <FormSelect v-bind="field">
            <FormSelectTrigger>
              <FormSelectValue placeholder="Select permission level" />
            </FormSelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="admin">Admin</FormSelectItem>
              <FormSelectItem value="level1">Level 1</FormSelectItem>
              <FormSelectItem value="level2">Level 2</FormSelectItem>
            </FormSelectContent>
          </FormSelect>
          <FormMessage />
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
</template>
