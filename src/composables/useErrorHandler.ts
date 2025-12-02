/**
 * Centralized error handling composable for Dashboard
 * Provides consistent error handling across the dashboard
 */

export interface AppError {
  message: string
  code?: string
  statusCode?: number
  originalError?: any
}

export const useErrorHandler = () => {
  const isDev = import.meta.env.DEV

  /**
   * Normalize error to AppError format
   */
  const normalizeError = (error: any): AppError => {
    // Handle fetch errors
    if (error?.message) {
      // Check if it's an API error response
      if (error.response) {
        return {
          message: error.response.message || error.message || 'Възникна неочаквана грешка',
          code: error.response.code,
          statusCode: error.statusCode || error.status,
          originalError: error,
        }
      }

      // Handle standard Error objects
      if (error instanceof Error) {
        return {
          message: error.message || 'Възникна неочаквана грешка',
          originalError: error,
        }
      }
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: error,
      }
    }

    // Handle object errors
    if (typeof error === 'object' && error !== null) {
      return {
        message: error.message || 'Възникна неочаквана грешка',
        code: error.code,
        statusCode: error.statusCode,
        originalError: error,
      }
    }

    // Fallback
    return {
      message: 'Възникна неочаквана грешка',
      originalError: error,
    }
  }

  /**
   * Get user-friendly error message
   */
  const getUserFriendlyMessage = (error: AppError): string => {
    const message = error.message

    // Map common error messages to user-friendly Bulgarian text
    const errorMap: Record<string, string> = {
      'Network request failed': 'Проблем с интернет връзката. Моля, опитайте отново.',
      'Failed to fetch': 'Проблем с връзката към сървъра. Моля, опитайте отново.',
      'Unauthorized': 'Не сте оторизирани. Моля, влезте отново в системата.',
      'Forbidden': 'Нямате права за достъп до този ресурс.',
      'Not Found': 'Заявеният ресурс не беше намерен.',
      'Internal Server Error': 'Възникна грешка в сървъра. Моля, опитайте по-късно.',
      'Bad Request': 'Невалидна заявка. Моля, проверете въведените данни.',
      'Validation failed': 'Грешка при валидация. Моля, проверете въведените данни.',
    }

    // Check for exact matches
    if (errorMap[message]) {
      return errorMap[message]
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return value
      }
    }

    // Return original message if no mapping found
    return message
  }

  /**
   * Handle error and return formatted error message
   */
  const handleError = (error: any): AppError => {
    const normalizedError = normalizeError(error)
    
    // Log error in development
    if (isDev) {
      console.error('Error handled:', normalizedError, normalizedError.originalError)
    }

    return normalizedError
  }

  /**
   * Handle error and show message
   */
  const handleErrorWithMessage = (error: any, showMessage: (type: 'success' | 'error', text: string) => void) => {
    const normalizedError = handleError(error)
    const userMessage = getUserFriendlyMessage(normalizedError)
    
    showMessage('error', userMessage)
    
    return normalizedError
  }

  /**
   * Handle API errors specifically
   */
  const handleApiError = (error: any): AppError => {
    let normalizedError = normalizeError(error)

    // Extract API error message from response
    if (error?.response) {
      const apiError = error.response
      normalizedError = {
        message: apiError.message || normalizedError.message,
        code: apiError.code,
        statusCode: apiError.statusCode || error.status,
        originalError: error,
      }
    }

    return handleError(normalizedError)
  }

  /**
   * Check if error is a specific type
   */
  const isErrorType = (error: any, type: 'network' | 'auth' | 'validation' | 'server'): boolean => {
    const normalizedError = normalizeError(error)
    
    switch (type) {
      case 'network':
        return normalizedError.statusCode === undefined || 
               normalizedError.message.includes('fetch') ||
               normalizedError.message.includes('network')
      case 'auth':
        return normalizedError.statusCode === 401 || normalizedError.statusCode === 403
      case 'validation':
        return normalizedError.statusCode === 400 || normalizedError.code === 'VALIDATION_ERROR'
      case 'server':
        return normalizedError.statusCode !== undefined && normalizedError.statusCode >= 500
      default:
        return false
    }
  }

  return {
    normalizeError,
    getUserFriendlyMessage,
    handleError,
    handleErrorWithMessage,
    handleApiError,
    isErrorType,
  }
}

