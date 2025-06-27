import type { Component, VNode } from 'vue'
import { ref } from 'vue'
import type { ToastRootProps } from 'radix-vue'

const TOAST_LIMIT = 1

export type ToasterToast = ToastRootProps & {
  id: string
  title?: string
  description?: string
  action?: Component
  component?: VNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'default' | 'destructive'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

type Action =
  | {
      type: 'ADD_TOAST'
      toast: ToasterToast
    }
  | {
      type: 'UPDATE_TOAST'
      toast: Partial<ToasterToast>
    }
  | {
      type: 'DISMISS_TOAST'
      toastId?: ToasterToast['id']
    }
  | {
      type: 'REMOVE_TOAST'
      toastId?: ToasterToast['id']
    }

const toasts = ref<ToasterToast[]>([])

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

function dispatch(action: Action) {
  switch (action.type) {
    case 'ADD_TOAST':
      toasts.value = [action.toast, ...toasts.value].slice(0, TOAST_LIMIT)
      break

    case 'UPDATE_TOAST':
      toasts.value = toasts.value.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t,
      )
      break

    case 'DISMISS_TOAST': {
      const { toastId } = action

      if (toastId) {
        toasts.value = toasts.value.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        )
      } else {
        toasts.value = toasts.value.map((t) => ({
          ...t,
          open: false,
        }))
      }
      break
    }

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) toasts.value = []
      else toasts.value = toasts.value.filter((t) => t.id !== action.toastId)

      break
  }
}

function useToast() {
  function toast(props: Omit<ToasterToast, 'id'>) {
    const id = genId()

    const update = (props: ToasterToast) =>
      dispatch({
        type: 'UPDATE_TOAST',
        toast: { ...props, id },
      })
    const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

    dispatch({
      type: 'ADD_TOAST',
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange(open: boolean) {
          if (!open) dismiss()
        },
      },
    })

    return {
      id,
      dismiss,
      update,
    }
  }

  function dismissAll() {
    dispatch({ type: 'DISMISS_TOAST' })
  }

  function onMouseEnter() {
    // Pause toast dismissal on hover
  }

  function onMouseLeave() {
    // Resume toast dismissal on leave
  }

  return {
    toasts,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    dismissAll,
    onMouseEnter,
    onMouseLeave,
  }
}

export { useToast }

export default useToast 