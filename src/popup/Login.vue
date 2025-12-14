<template>
  <div :class="cn('flex w-full h-full items-center justify-center p-4 bg-background overflow-y-auto', className)">
    <Card class="w-full max-w-md">
      <CardHeader>
      <!-- Logo -->
        <div class="flex justify-center mb-4">
        <div class="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
          <span class="text-primary-foreground font-bold text-2xl">N</span>
        </div>
      </div>

        <CardTitle class="text-center">
          {{ isSignUp ? 'Create Account' : 'Welcome Back' }}
        </CardTitle>
        <CardDescription class="text-center">
          {{ isSignUp ? 'Sign up to start saving your content' : 'Enter your email below to login to your account' }}
        </CardDescription>
      </CardHeader>
      <CardContent>
      <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-destructive/10 border border-destructive/50 rounded-lg p-3">
          <p class="text-destructive text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Success Message -->
        <div v-if="successMessage" class="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-3">
        <p class="text-primary text-sm">{{ successMessage }}</p>
      </div>

        <form @submit.prevent="handleSubmit">
          <FieldGroup>
            <Field>
              <FieldLabel for="email">Email</FieldLabel>
              <Input
            id="email"
            v-model="email"
            type="email"
                placeholder="m@example.com"
            required
              />
            </Field>
            <Field>
              <div class="flex items-center">
                <FieldLabel for="password">Password</FieldLabel>
                <a
                  href="#"
                  class="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                  @click.prevent
                >
                  Forgot your password?
                </a>
        </div>
              <Input
            id="password"
            v-model="password"
            type="password"
                :placeholder="isSignUp ? 'At least 6 characters' : 'Enter your password'"
            required
              />
            </Field>
            <Field>
              <Button type="submit" :disabled="isLoading" class="w-full">
                <svg v-if="isLoading" class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
                {{ isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login') }}
              </Button>
              
              <FieldDescription class="text-center">
                {{ isSignUp ? 'Already have an account? ' : "Don't have an account? " }}
                <a
                  href="#"
                  class="underline-offset-4 hover:underline"
                  @click.prevent="toggleMode"
        >
                  {{ isSignUp ? 'Sign in' : 'Sign up' }}
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { signUp, signIn } from '../utils/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const emit = defineEmits(['login-success'])

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const className = ref('')

async function handleSubmit(event?: Event) {
  event?.preventDefault()
  
  // Clear previous messages
  errorMessage.value = ''
  successMessage.value = ''
  
  // Get and trim values
  const emailVal = String(email.value || '').trim()
  const passwordVal = String(password.value || '').trim()
  
  // Validate fields
  if (!emailVal || !passwordVal) {
    errorMessage.value = 'Please fill in all fields'
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailVal)) {
    errorMessage.value = 'Please enter a valid email address'
    return
  }

  // Validate password length for sign up
  if (isSignUp.value && passwordVal.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return
  }

  isLoading.value = true

  try {
    if (isSignUp.value) {
      const { error } = await signUp(emailVal, passwordVal)
      
      if (error) {
        errorMessage.value = error
      } else {
        successMessage.value = 'Account created! Please check your email to confirm.'
        // Clear form
        email.value = ''
        password.value = ''
        setTimeout(() => {
          isSignUp.value = false
          successMessage.value = ''
        }, 3000)
      }
    } else {
      const { user, error } = await signIn(emailVal, passwordVal)
      
      if (error) {
        errorMessage.value = error
      } else if (user) {
        emit('login-success', user)
      }
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value
  errorMessage.value = ''
  successMessage.value = ''
}
</script>
