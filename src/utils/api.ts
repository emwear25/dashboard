/**
 * Centralized API utility for making requests to the backend
 * All API calls should use this utility to avoid hardcoded URLs
 */

// Get API base URL from environment variable or use default
const getApiBase = (): string => {
  // Check for Vite environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback to default for development
  return "http://localhost:3030";
};

/**
 * Get the full API URL for an endpoint
 * @param endpoint - API endpoint path (e.g., '/api/products' or 'products')
 * @returns Full URL to the API endpoint
 */
export const getApiUrl = (endpoint: string): string => {
  const apiBase = getApiBase();

  // Remove leading slash if present, we'll add it
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // If endpoint already starts with 'api/', use it as is
  if (cleanEndpoint.startsWith("api/")) {
    return `${apiBase}/${cleanEndpoint}`;
  }

  // Otherwise, prepend 'api/'
  return `${apiBase}/api/${cleanEndpoint}`;
};

/**
 * Make an authenticated API request
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = getApiUrl(endpoint);

  // Ensure credentials are included for cookie-based auth
  const defaultOptions: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    // Create a structured error object
    const error: any = new Error(errorData.message || `Request failed: ${response.statusText}`);
    error.response = errorData;
    error.statusCode = response.status;
    error.status = response.status;
    throw error;
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  return (await response.text()) as unknown as T;
};

/**
 * GET request helper
 */
export const apiGet = <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: "GET" });
};

/**
 * POST request helper
 */
export const apiPost = <T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * PUT request helper
 */
export const apiPut = <T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * PATCH request helper
 */
export const apiPatch = <T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * DELETE request helper
 */
export const apiDelete = <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
};

/**
 * Upload file helper (FormData)
 */
export const apiUpload = async <T = any>(
  endpoint: string,
  formData: FormData,
  options?: RequestInit
): Promise<T> => {
  const url = getApiUrl(endpoint);

  const defaultOptions: RequestInit = {
    credentials: "include",
    method: "POST",
    body: formData,
    // Don't set Content-Type header, browser will set it with boundary
    ...options,
  };

  // Remove Content-Type header if present (FormData needs boundary)
  if (defaultOptions.headers) {
    const headers = new Headers(defaultOptions.headers);
    headers.delete("Content-Type");
    defaultOptions.headers = headers;
  }

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    // Create a structured error object
    const error: any = new Error(errorData.message || `Upload failed: ${response.statusText}`);
    error.response = errorData;
    error.statusCode = response.status;
    error.status = response.status;
    throw error;
  }

  return await response.json();
};

// Export the base URL getter for cases where full URL is needed
export const getApiBaseUrl = getApiBase;
