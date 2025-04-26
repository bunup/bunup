/**
 * Advanced API Client and State Management Library
 * Comprehensive tools for API interactions and application state management
 */

// Type definitions
export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'HEAD'
	| 'OPTIONS'
export type RequestHeaders = Record<string, string>
export type QueryParams = Record<
	string,
	string | number | boolean | null | undefined
>
export type RequestBody = any
export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'formdata'
export type RequestInterceptor = (
	config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>
export type ResponseInterceptor = (
	response: HttpResponse,
) => HttpResponse | Promise<HttpResponse>
export type ErrorInterceptor = (
	error: HttpError,
) => HttpError | Promise<HttpError>

/**
 * HTTP request configuration
 */
export interface RequestConfig {
	method: HttpMethod
	url: string
	baseURL?: string
	headers?: RequestHeaders
	params?: QueryParams
	data?: RequestBody
	timeout?: number
	responseType?: ResponseType
	withCredentials?: boolean
	abortSignal?: AbortSignal
	retryConfig?: RetryConfig
	cache?: RequestCache
	onProgress?: (progress: ProgressEvent) => void
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = any> {
	data: T
	status: number
	statusText: string
	headers: Record<string, string>
	config: RequestConfig
	request?: XMLHttpRequest
}

/**
 * HTTP error interface
 */
export class HttpError extends Error {
	public name = 'HttpError'
	public status: number
	public statusText: string
	public data: any
	public config: RequestConfig
	public response?: HttpResponse
	public request?: XMLHttpRequest
	public isHttpError = true

	constructor(
		message: string,
		status: number,
		statusText: string,
		config: RequestConfig,
		response?: HttpResponse,
	) {
		super(message)
		this.status = status
		this.statusText = statusText
		this.config = config
		this.response = response
		this.data = response?.data
	}

	/**
	 * Checks if the error is a network error
	 */
	isNetworkError(): boolean {
		return this.status === 0 && !this.response
	}

	/**
	 * Checks if the error is a timeout error
	 */
	isTimeoutError(): boolean {
		return this.message === 'Request timeout'
	}

	/**
	 * Checks if the error is a client error (4xx)
	 */
	isClientError(): boolean {
		return this.status >= 400 && this.status < 500
	}

	/**
	 * Checks if the error is a server error (5xx)
	 */
	isServerError(): boolean {
		return this.status >= 500
	}
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	maxRetries: number
	retryDelay: number
	retryCondition?: (error: HttpError) => boolean
	retryAttempt?: number
	backoffFactor?: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	retryDelay: 1000,
	retryCondition: (error: HttpError) =>
		error.isServerError() || error.isNetworkError(),
	backoffFactor: 2,
}

/**
 * HTTP Client implementation
 */
export class HttpClient {
	private baseURL: string
	private defaultHeaders: RequestHeaders
	private timeout: number
	private requestInterceptors: RequestInterceptor[]
	private responseInterceptors: ResponseInterceptor[]
	private errorInterceptors: ErrorInterceptor[]
	private abortControllers: Map<string, AbortController>

	constructor(
		config: {
			baseURL?: string
			headers?: RequestHeaders
			timeout?: number
		} = {},
	) {
		this.baseURL = config.baseURL || ''
		this.defaultHeaders = config.headers || {}
		this.timeout = config.timeout || 30000
		this.requestInterceptors = []
		this.responseInterceptors = []
		this.errorInterceptors = []
		this.abortControllers = new Map()
	}

	/**
	 * Adds a request interceptor
	 */
	addRequestInterceptor(interceptor: RequestInterceptor): () => void {
		this.requestInterceptors.push(interceptor)
		return () => {
			const index: number = this.requestInterceptors.indexOf(interceptor)
			if (index !== -1) {
				this.requestInterceptors.splice(index, 1)
			}
		}
	}

	/**
	 * Adds a response interceptor
	 */
	addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
		this.responseInterceptors.push(interceptor)
		return () => {
			const index: number = this.responseInterceptors.indexOf(interceptor)
			if (index !== -1) {
				this.responseInterceptors.splice(index, 1)
			}
		}
	}

	/**
	 * Adds an error interceptor
	 */
	addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
		this.errorInterceptors.push(interceptor)
		return () => {
			const index: number = this.errorInterceptors.indexOf(interceptor)
			if (index !== -1) {
				this.errorInterceptors.splice(index, 1)
			}
		}
	}

	/**
	 * Makes an HTTP request
	 */
	async request<T = any>(config: RequestConfig): Promise<HttpResponse<T>> {
		// Create a unique ID for this request
		const requestId: string = `${config.method}-${config.url}-${Date.now()}`

		// Apply request interceptors
		let modifiedConfig: RequestConfig = { ...config }
		for (const interceptor of this.requestInterceptors) {
			modifiedConfig = await interceptor(modifiedConfig)
		}

		// Create an AbortController if not provided
		if (!modifiedConfig.abortSignal) {
			const controller: AbortController = new AbortController()
			modifiedConfig.abortSignal = controller.signal
			this.abortControllers.set(requestId, controller)
		}

		try {
			// Make the request
			const response: HttpResponse<T> =
				await this.fetchRequest<T>(modifiedConfig)

			// Apply response interceptors
			let modifiedResponse: HttpResponse<T> = { ...response }
			for (const interceptor of this.responseInterceptors) {
				modifiedResponse = await interceptor(modifiedResponse)
			}

			// Clean up
			this.abortControllers.delete(requestId)

			return modifiedResponse
		} catch (error: any) {
			let httpError: HttpError

			if (error instanceof HttpError) {
				httpError = error
			} else {
				httpError = new HttpError(
					error?.message || 'Request failed',
					0,
					'',
					modifiedConfig,
				)
			}

			// Apply error interceptors
			for (const interceptor of this.errorInterceptors) {
				httpError = await interceptor(httpError)
			}

			// Handle retries if configured
			if (modifiedConfig.retryConfig) {
				const retryResult: HttpResponse<T> | null =
					await this.handleRetry<T>(httpError, modifiedConfig)
				if (retryResult) {
					return retryResult
				}
			}

			// Clean up
			this.abortControllers.delete(requestId)

			throw httpError
		}
	}

	/**
	 * Makes a GET request
	 */
	get<T = any>(
		url: string,
		config: Omit<RequestConfig, 'method' | 'url'> = {},
	): Promise<HttpResponse<T>> {
		return this.request<T>({
			method: 'GET',
			url,
			...config,
		})
	}

	/**
	 * Makes a POST request
	 */
	post<T = any>(
		url: string,
		data?: RequestBody,
		config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {},
	): Promise<HttpResponse<T>> {
		return this.request<T>({
			method: 'POST',
			url,
			data,
			...config,
		})
	}

	/**
	 * Makes a PUT request
	 */
	put<T = any>(
		url: string,
		data?: RequestBody,
		config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {},
	): Promise<HttpResponse<T>> {
		return this.request<T>({
			method: 'PUT',
			url,
			data,
			...config,
		})
	}

	/**
	 * Makes a DELETE request
	 */
	delete<T = any>(
		url: string,
		config: Omit<RequestConfig, 'method' | 'url'> = {},
	): Promise<HttpResponse<T>> {
		return this.request<T>({
			method: 'DELETE',
			url,
			...config,
		})
	}

	/**
	 * Makes a PATCH request
	 */
	patch<T = any>(
		url: string,
		data?: RequestBody,
		config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {},
	): Promise<HttpResponse<T>> {
		return this.request<T>({
			method: 'PATCH',
			url,
			data,
			...config,
		})
	}

	/**
	 * Cancels a request by URL
	 */
	cancelRequest(url: string): void {
		for (const [requestId, controller] of this.abortControllers.entries()) {
			if (requestId.includes(url)) {
				controller.abort()
				this.abortControllers.delete(requestId)
			}
		}
	}

	/**
	 * Cancels all pending requests
	 */
	cancelAllRequests(): void {
		for (const controller of this.abortControllers.values()) {
			controller.abort()
		}
		this.abortControllers.clear()
	}

	/**
	 * Builds a full URL from the base URL, path, and query parameters
	 */
	private buildUrl(config: RequestConfig): string {
		const { url, baseURL = this.baseURL, params } = config

		// Combine base URL and path
		const fullUrl: string = baseURL
			? baseURL.endsWith('/') && url.startsWith('/')
				? baseURL + url.slice(1)
				: baseURL + url
			: url

		// If no query params, return the full URL
		if (!params) {
			return fullUrl
		}

		// Add query parameters
		const queryString: string = Object.entries(params)
			.filter(([_, value]) => value !== null && value !== undefined)
			.map(
				([key, value]) =>
					`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
			)
			.join('&')

		if (!queryString) {
			return fullUrl
		}

		return fullUrl.includes('?')
			? `${fullUrl}&${queryString}`
			: `${fullUrl}?${queryString}`
	}

	/**
	 * Makes the actual fetch request
	 */
	private async fetchRequest<T>(
		config: RequestConfig,
	): Promise<HttpResponse<T>> {
		const {
			method,
			headers = {},
			data,
			timeout = this.timeout,
			responseType = 'json',
			withCredentials = false,
			abortSignal,
		}: RequestConfig = config

		const url: string = this.buildUrl(config)

		// Combine default headers with request headers
		const requestHeaders: RequestHeaders = {
			...this.defaultHeaders,
			...headers,
		}

		// Automatically set content-type if not provided
		if (
			data &&
			!requestHeaders['Content-Type'] &&
			!(data instanceof FormData)
		) {
			requestHeaders['Content-Type'] = 'application/json'
		}

		// Prepare request options
		const options: RequestInit = {
			method,
			headers: requestHeaders,
			credentials: withCredentials ? 'include' : 'same-origin',
			signal: abortSignal,
		}

		// Add body if needed
		if (data !== undefined && method !== 'GET' && method !== 'HEAD') {
			if (data instanceof FormData) {
				options.body = data
			} else if (typeof data === 'object') {
				options.body = JSON.stringify(data)
			} else {
				options.body = data
			}
		}

		// Create a timeout promise
		const timeoutPromise: Promise<never> = new Promise<never>(
			(_, reject) => {
				setTimeout(() => {
					reject(new HttpError('Request timeout', 0, '', config))
				}, timeout)
			},
		)

		// Make the request with timeout
		const response: Response = await Promise.race([
			fetch(url, options),
			timeoutPromise,
		])

		// Extract headers
		const responseHeaders: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value
		})

		// Parse response based on responseType
		let responseData: T

		switch (responseType) {
			case 'text':
				responseData = (await response.text()) as unknown as T
				break
			case 'blob':
				responseData = (await response.blob()) as unknown as T
				break
			case 'arraybuffer':
				responseData = (await response.arrayBuffer()) as unknown as T
				break
			case 'formdata':
				responseData = (await response.formData()) as unknown as T
				break
			default: {
				// Try to parse JSON, fallback to text if it fails
				const text: string = await response.text()
				try {
					responseData = text ? JSON.parse(text) : null
				} catch (e) {
					responseData = text as unknown as T
				}
				break
			}
		}

		// Create response object
		const httpResponse: HttpResponse<T> = {
			data: responseData,
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
			config,
		}

		// Handle error responses
		if (!response.ok) {
			throw new HttpError(
				`Request failed with status ${response.status}`,
				response.status,
				response.statusText,
				config,
				httpResponse,
			)
		}

		return httpResponse
	}

	/**
	 * Handles retry logic for failed requests
	 */
	private async handleRetry<T>(
		error: HttpError,
		config: RequestConfig,
	): Promise<HttpResponse<T> | null> {
		const retryConfig: RetryConfig = {
			...DEFAULT_RETRY_CONFIG,
			...config.retryConfig,
		}

		// Check if we should retry this error
		if (
			!config.retryConfig ||
			(retryConfig.retryCondition && !retryConfig.retryCondition(error))
		) {
			return null
		}

		// Track retry attempt in the config
		const retryAttempt: number = config.retryConfig?.retryAttempt || 0

		// Check if we've reached the max retries
		if (retryAttempt >= retryConfig.maxRetries) {
			return null
		}

		// Calculate backoff delay
		const delay: number =
			retryConfig.retryDelay *
			(retryConfig.backoffFactor || 1) ** retryAttempt

		// Wait before retrying
		await new Promise<void>((resolve) => setTimeout(resolve, delay))

		// Create new config with incremented retry attempt
		const newConfig: RequestConfig = {
			...config,
			retryConfig: {
				...config.retryConfig,
				retryAttempt: retryAttempt + 1,
			},
		}

		// Retry the request
		return this.request<T>(newConfig)
	}
}

/**
 * Creates a default HTTP client instance
 */
export const createHttpClient = (config?: {
	baseURL?: string
	headers?: RequestHeaders
	timeout?: number
}): HttpClient => {
	return new HttpClient(config)
}

/**
 * Default HTTP client instance
 */
export const httpClient: HttpClient = createHttpClient()

/**
 * API resource class for creating RESTful endpoints
 */
export class ApiResource<T> {
	private httpClient: HttpClient
	private baseEndpoint: string

	constructor(httpClient: HttpClient, baseEndpoint: string) {
		this.httpClient = httpClient
		this.baseEndpoint = baseEndpoint.endsWith('/')
			? baseEndpoint.slice(0, -1)
			: baseEndpoint
	}

	/**
	 * Gets all resources
	 */
	async getAll(params?: QueryParams): Promise<T[]> {
		const response: HttpResponse<T[]> = await this.httpClient.get<T[]>(
			this.baseEndpoint,
			{
				params,
			},
		)
		return response.data
	}

	/**
	 * Gets a resource by ID
	 */
	async getById(id: string | number): Promise<T> {
		const response: HttpResponse<T> = await this.httpClient.get<T>(
			`${this.baseEndpoint}/${id}`,
		)
		return response.data
	}

	/**
	 * Creates a new resource
	 */
	async create(data: Partial<T>): Promise<T> {
		const response: HttpResponse<T> = await this.httpClient.post<T>(
			this.baseEndpoint,
			data,
		)
		return response.data
	}

	/**
	 * Updates a resource
	 */
	async update(id: string | number, data: Partial<T>): Promise<T> {
		const response: HttpResponse<T> = await this.httpClient.put<T>(
			`${this.baseEndpoint}/${id}`,
			data,
		)
		return response.data
	}

	/**
	 * Partially updates a resource
	 */
	async patch(id: string | number, data: Partial<T>): Promise<T> {
		const response: HttpResponse<T> = await this.httpClient.patch<T>(
			`${this.baseEndpoint}/${id}`,
			data,
		)
		return response.data
	}

	/**
	 * Deletes a resource
	 */
	async delete(id: string | number): Promise<void> {
		await this.httpClient.delete(`${this.baseEndpoint}/${id}`)
	}

	/**
	 * Creates a custom method
	 */
	async custom<R = any>(
		method: HttpMethod,
		path: string,
		data?: any,
		config?: Omit<RequestConfig, 'method' | 'url' | 'data'>,
	): Promise<R> {
		const url: string = path.startsWith('/')
			? `${this.baseEndpoint}${path}`
			: `${this.baseEndpoint}/${path}`

		const response: HttpResponse<R> = await this.httpClient.request<R>({
			method,
			url,
			data,
			...config,
		})

		return response.data
	}
}

/**
 * Creates an API resource
 */
export const createApiResource = <T>(
	httpClient: HttpClient,
	baseEndpoint: string,
): ApiResource<T> => {
	return new ApiResource<T>(httpClient, baseEndpoint)
}

// State Management

/**
 * Observer pattern interfaces
 */
export interface Observer<T> {
	update(data: T): void
}

export interface Subject<T> {
	attach(observer: Observer<T>): void
	detach(observer: Observer<T>): void
	notify(): void
}

/**
 * Generic observable store implementation
 */
export class Store<T> implements Subject<T> {
	private state: T
	private observers: Set<Observer<T>>

	constructor(initialState: T) {
		this.state = initialState
		this.observers = new Set()
	}

	/**
	 * Gets the current state
	 */
	getState(): T {
		return { ...(this.state as any) }
	}

	/**
	 * Sets a new state
	 */
	setState(newState: Partial<T>): void {
		this.state = { ...(this.state as any), ...(newState as any) }
		this.notify()
	}

	/**
	 * Updates the state using a function
	 */
	updateState(updater: (state: T) => Partial<T>): void {
		const newState: Partial<T> = updater(this.getState())
		this.setState(newState)
	}

	/**
	 * Adds an observer
	 */
	attach(observer: Observer<T>): void {
		this.observers.add(observer)
		observer.update(this.getState())
	}

	/**
	 * Removes an observer
	 */
	detach(observer: Observer<T>): void {
		this.observers.delete(observer)
	}

	/**
	 * Notifies all observers
	 */
	notify(): void {
		for (const observer of this.observers) {
			observer.update(this.getState())
		}
	}

	/**
	 * Subscribes a callback function
	 */
	subscribe(callback: (state: T) => void): () => void {
		const observer: Observer<T> = {
			update: callback,
		}

		this.attach(observer)

		return () => {
			this.detach(observer)
		}
	}
}

/**
 * API state interface
 */
export interface ApiState<T> {
	data: T | null
	loading: boolean
	error: Error | null
	loaded: boolean
}

/**
 * Creates an initial API state
 */
export const createInitialApiState = <T>(): ApiState<T> => ({
	data: null,
	loading: false,
	error: null,
	loaded: false,
})

/**
 * API store for handling async data
 */
export class ApiStore<T> extends Store<ApiState<T>> {
	constructor() {
		super(createInitialApiState<T>())
	}

	/**
	 * Sets the loading state
	 */
	setLoading(): void {
		this.setState({
			loading: true,
			error: null,
		})
	}

	/**
	 * Sets the success state
	 */
	setSuccess(data: T): void {
		this.setState({
			data,
			loading: false,
			error: null,
			loaded: true,
		})
	}

	/**
	 * Sets the error state
	 */
	setError(error: Error): void {
		this.setState({
			loading: false,
			error,
			loaded: true,
		})
	}

	/**
	 * Resets the store
	 */
	reset(): void {
		this.setState(createInitialApiState<T>())
	}

	/**
	 * Loads data from an async function
	 */
	async load(asyncFn: () => Promise<T>): Promise<T> {
		try {
			this.setLoading()
			const data: T = await asyncFn()
			this.setSuccess(data)
			return data
		} catch (error) {
			const err: Error =
				error instanceof Error ? error : new Error(String(error))
			this.setError(err)
			throw err
		}
	}
}

/**
 * Creates an API store
 */
export const createApiStore = <T>(): ApiStore<T> => {
	return new ApiStore<T>()
}

/**
 * Collection state interface
 */
export interface CollectionState<T> {
	items: T[]
	loading: boolean
	error: Error | null
	loaded: boolean
	selectedId: string | number | null
	selectedItem: T | null
}

/**
 * Creates an initial collection state
 */
export const createInitialCollectionState = <T>(): CollectionState<T> => ({
	items: [],
	loading: false,
	error: null,
	loaded: false,
	selectedId: null,
	selectedItem: null,
})

/**
 * Collection store for handling collections of items
 */
export class CollectionStore<T extends { id: string | number }> extends Store<
	CollectionState<T>
> {
	constructor() {
		super(createInitialCollectionState<T>())
	}

	/**
	 * Sets the loading state
	 */
	setLoading(): void {
		this.setState({
			loading: true,
			error: null,
		})
	}

	/**
	 * Sets the success state with items
	 */
	setItems(items: T[]): void {
		this.setState({
			items,
			loading: false,
			error: null,
			loaded: true,
		})

		// Update selected item if there's a selectedId
		const { selectedId }: CollectionState<T> = this.getState()
		if (selectedId !== null) {
			this.selectById(selectedId)
		}
	}

	/**
	 * Sets the error state
	 */
	setError(error: Error): void {
		this.setState({
			loading: false,
			error,
			loaded: true,
		})
	}

	/**
	 * Adds an item to the collection
	 */
	addItem(item: T): void {
		const { items }: CollectionState<T> = this.getState()
		this.setState({
			items: [...items, item],
		})
	}

	/**
	 * Updates an item in the collection
	 */
	updateItem(item: T): void {
		const { items, selectedId }: CollectionState<T> = this.getState()
		const updatedItems: T[] = items.map((i) =>
			i.id === item.id ? item : i,
		)

		this.setState({
			items: updatedItems,
			selectedItem:
				selectedId === item.id ? item : this.getState().selectedItem,
		})
	}

	/**
	 * Removes an item from the collection
	 */
	removeItem(id: string | number): void {
		const { items, selectedId }: CollectionState<T> = this.getState()
		const updatedItems: T[] = items.filter((item) => item.id !== id)

		this.setState({
			items: updatedItems,
			selectedId: selectedId === id ? null : selectedId,
			selectedItem:
				selectedId === id ? null : this.getState().selectedItem,
		})
	}

	/**
	 * Selects an item by ID
	 */
	selectById(id: string | number | null): void {
		if (id === null) {
			this.setState({
				selectedId: null,
				selectedItem: null,
			})
			return
		}

		const { items }: CollectionState<T> = this.getState()
		const selectedItem: T | null =
			items.find((item) => item.id === id) || null

		this.setState({
			selectedId: id,
			selectedItem,
		})
	}

	/**
	 * Gets an item by ID
	 */
	getById(id: string | number): T | undefined {
		const { items }: CollectionState<T> = this.getState()
		return items.find((item) => item.id === id)
	}

	/**
	 * Loads data from an async function
	 */
	async load(asyncFn: () => Promise<T[]>): Promise<T[]> {
		try {
			this.setLoading()
			const items: T[] = await asyncFn()
			this.setItems(items)
			return items
		} catch (error) {
			const err: Error =
				error instanceof Error ? error : new Error(String(error))
			this.setError(err)
			throw err
		}
	}
}

/**
 * Creates a collection store
 */
export const createCollectionStore = <
	T extends { id: string | number },
>(): CollectionStore<T> => {
	return new CollectionStore<T>()
}

/**
 * Form field state
 */
export interface FormFieldState<T> {
	value: T
	initialValue: T
	touched: boolean
	dirty: boolean
	errors: string[]
	validating: boolean
	valid: boolean
}

/**
 * Form state
 */
export interface FormState<T> {
	values: T
	initialValues: T
	fields: Record<keyof T, FormFieldState<any>>
	touched: boolean
	dirty: boolean
	errors: Record<keyof T, string[]>
	validating: boolean
	valid: boolean
	submitting: boolean
	submitted: boolean
	submitCount: number
}

/**
 * Form validator function
 */
export type FormValidator<T> = (
	values: T,
) => Record<keyof T, string[]> | Promise<Record<keyof T, string[]>>

/**
 * Form options
 */
export interface FormOptions<T> {
	initialValues: T
	validators?: FormValidator<T>[]
	onSubmit?: (values: T) => Promise<void> | void
}

/**
 * Creates an initial form field state
 */
export const createFormFieldState = <T>(value: T): FormFieldState<T> => ({
	value,
	initialValue: value,
	touched: false,
	dirty: false,
	errors: [],
	validating: false,
	valid: true,
})

/**
 * Creates initial form state
 */
export const createFormState = <T extends Record<string, any>>(
	initialValues: T,
): FormState<T> => {
	const fields = Object.keys(initialValues).reduce(
		(acc, key) => {
			acc[key as keyof T] = createFormFieldState(initialValues[key])
			return acc
		},
		{} as Record<keyof T, FormFieldState<any>>,
	)

	return {
		values: { ...initialValues },
		initialValues: { ...initialValues },
		fields,
		touched: false,
		dirty: false,
		errors: Object.keys(initialValues).reduce(
			(acc, key) => {
				acc[key as keyof T] = []
				return acc
			},
			{} as Record<keyof T, string[]>,
		),
		validating: false,
		valid: true,
		submitting: false,
		submitted: false,
		submitCount: 0,
	}
}

/**
 * Form store for handling form state
 */
export class FormStore<T extends Record<string, any>> extends Store<
	FormState<T>
> {
	private validators: FormValidator<T>[] = []
	private onSubmit?: (values: T) => Promise<void> | void

	constructor(options: FormOptions<T>) {
		super(createFormState(options.initialValues))

		this.validators = options.validators || []
		this.onSubmit = options.onSubmit
	}

	/**
	 * Sets a field value
	 */
	setFieldValue<K extends keyof T>(field: K, value: T[K]): void {
		const state = this.getState()
		const fieldState = state.fields[field]

		this.setState({
			values: {
				...state.values,
				[field]: value,
			},
			fields: {
				...state.fields,
				[field]: {
					...fieldState,
					value,
					dirty: value !== fieldState.initialValue,
					touched: true,
				},
			},
			touched: true,
			dirty: this.isDirty(
				{ ...state.values, [field]: value },
				state.initialValues,
			),
		})

		this.validateField(field)
	}

	/**
	 * Validates a single field
	 */
	async validateField<K extends keyof T>(field: K): Promise<void> {
		const state = this.getState()

		this.setState({
			fields: {
				...state.fields,
				[field]: {
					...state.fields[field],
					validating: true,
				},
			},
			validating: true,
		})

		const errors: string[] = []

		for (const validator of this.validators) {
			const result = await validator(state.values)
			if (result[field] && result[field].length > 0) {
				errors.push(...result[field])
			}
		}

		const newState = this.getState()

		this.setState({
			fields: {
				...newState.fields,
				[field]: {
					...newState.fields[field],
					errors,
					validating: false,
					valid: errors.length === 0,
				},
			},
			errors: {
				...newState.errors,
				[field]: errors,
			},
			validating: this.isValidating(newState.fields, field),
			valid: this.isValid({ ...newState.errors, [field]: errors }),
		})
	}

	/**
	 * Validates all fields
	 */
	async validateForm(): Promise<boolean> {
		const state = this.getState()
		const fields = Object.keys(state.values) as Array<keyof T>

		this.setState({
			validating: true,
		})

		const newFields = { ...state.fields }
		for (const field of fields) {
			newFields[field] = {
				...newFields[field],
				validating: true,
			}
		}

		this.setState({
			fields: newFields,
		})

		const errors: Record<keyof T, string[]> = Object.keys(
			state.values,
		).reduce(
			(acc, key) => {
				acc[key as keyof T] = []
				return acc
			},
			{} as Record<keyof T, string[]>,
		)

		for (const validator of this.validators) {
			const result = await validator(state.values)

			for (const field of fields) {
				if (result[field] && result[field].length > 0) {
					errors[field].push(...result[field])
				}
			}
		}

		const newFieldsWithErrors = { ...state.fields }
		for (const field of fields) {
			newFieldsWithErrors[field] = {
				...newFieldsWithErrors[field],
				errors: errors[field],
				validating: false,
				valid: errors[field].length === 0,
			}
		}

		const isValid = this.isValid(errors)

		this.setState({
			fields: newFieldsWithErrors,
			errors,
			validating: false,
			valid: isValid,
		})

		return isValid
	}

	/**
	 * Submits the form
	 */
	async submitForm(): Promise<void> {
		const state = this.getState()

		this.setState({
			submitting: true,
		})

		const isValid = await this.validateForm()

		if (!isValid) {
			this.setState({
				submitting: false,
				submitCount: state.submitCount + 1,
			})
			return
		}

		try {
			if (this.onSubmit) {
				await this.onSubmit(state.values)
			}

			this.setState({
				submitting: false,
				submitted: true,
				submitCount: state.submitCount + 1,
			})
		} catch (error) {
			this.setState({
				submitting: false,
				submitCount: state.submitCount + 1,
			})
			throw error
		}
	}

	/**
	 * Resets the form
	 */
	resetForm(): void {
		const { initialValues } = this.getState()

		this.setState(createFormState(initialValues))
	}

	/**
	 * Sets multiple field values
	 */
	setValues(values: Partial<T>): void {
		const state = this.getState()
		const newValues = { ...state.values, ...values }

		const newFields = { ...state.fields }
		for (const field in values) {
			if (Object.prototype.hasOwnProperty.call(values, field)) {
				const typedField = field as keyof T
				newFields[typedField] = {
					...newFields[typedField],
					value: values[typedField] as any,
					dirty:
						values[typedField] !==
						newFields[typedField].initialValue,
					touched: true,
				}
			}
		}

		this.setState({
			values: newValues,
			fields: newFields,
			touched: true,
			dirty: this.isDirty(newValues, state.initialValues),
		})

		for (const field in values) {
			if (Object.prototype.hasOwnProperty.call(values, field)) {
				this.validateField(field as keyof T)
			}
		}
	}

	/**
	 * Checks if values are dirty compared to initial values
	 */
	private isDirty(values: T, initialValues: T): boolean {
		return Object.keys(values).some((key) => {
			const field = key as keyof T
			return values[field] !== initialValues[field]
		})
	}

	/**
	 * Checks if any field is validating
	 */
	private isValidating(
		fields: Record<keyof T, FormFieldState<any>>,
		except?: keyof T,
	): boolean {
		return Object.keys(fields).some((key) => {
			const field = key as keyof T
			return field !== except && fields[field].validating
		})
	}

	/**
	 * Checks if the form is valid
	 */
	private isValid(errors: Record<keyof T, string[]>): boolean {
		return Object.values(errors).every(
			(fieldErrors) => fieldErrors.length === 0,
		)
	}
}

/**
 * Creates a form store
 */
export const createFormStore = <T extends Record<string, any>>(
	options: FormOptions<T>,
): FormStore<T> => {
	return new FormStore<T>(options)
}

// Authentication utilities

/**
 * Authentication state
 */
export interface AuthState {
	user: any | null
	token: string | null
	authenticated: boolean
	loading: boolean
	error: Error | null
}

/**
 * Authentication options
 */
export interface AuthOptions {
	httpClient: HttpClient
	loginEndpoint?: string
	logoutEndpoint?: string
	refreshEndpoint?: string
	getUserEndpoint?: string
	tokenStorage?: Storage
	tokenKey?: string
	refreshTokenKey?: string
}

/**
 * Login credentials
 */
export interface LoginCredentials {
	username: string
	password: string
	[key: string]: any
}

/**
 * Authentication token response
 */
export interface AuthTokenResponse {
	token: string
	refreshToken?: string
	expiresIn?: number
	[key: string]: any
}

/**
 * Creates initial auth state
 */
export const createInitialAuthState = (): AuthState => ({
	user: null,
	token: null,
	authenticated: false,
	loading: false,
	error: null,
})

/**
 * Authentication store
 */
export class AuthStore extends Store<AuthState> {
	private httpClient: HttpClient
	private options: Required<AuthOptions>

	constructor(options: AuthOptions) {
		super(createInitialAuthState())

		// Set default options
		this.options = {
			httpClient: options.httpClient,
			loginEndpoint: options.loginEndpoint || '/auth/login',
			logoutEndpoint: options.logoutEndpoint || '/auth/logout',
			refreshEndpoint: options.refreshEndpoint || '/auth/refresh',
			getUserEndpoint: options.getUserEndpoint || '/auth/user',
			tokenStorage: options.tokenStorage || localStorage,
			tokenKey: options.tokenKey || 'auth_token',
			refreshTokenKey: options.refreshTokenKey || 'refresh_token',
		}

		this.httpClient = options.httpClient

		// Setup token interceptor
		this.setupTokenInterceptor()

		// Check for existing token
		this.initFromStorage()
	}

	/**
	 * Setup token interceptor to add token to requests
	 */
	private setupTokenInterceptor(): void {
		this.httpClient.addRequestInterceptor((config) => {
			const { token } = this.getState()

			if (token) {
				return {
					...config,
					headers: {
						...config.headers,
						Authorization: `Bearer ${token}`,
					},
				}
			}

			return config
		})
	}

	/**
	 * Initialize from storage
	 */
	private async initFromStorage(): Promise<void> {
		const { tokenStorage, tokenKey } = this.options
		const token = tokenStorage.getItem(tokenKey)

		if (token) {
			this.setState({
				token,
				authenticated: true,
			})

			try {
				await this.fetchUser()
			} catch (error) {
				// If fetching user fails, clear auth state
				this.logout()
			}
		}
	}

	/**
	 * Login with credentials
	 */
	async login(credentials: LoginCredentials): Promise<void> {
		this.setState({
			loading: true,
			error: null,
		})

		try {
			const response = await this.httpClient.post<AuthTokenResponse>(
				this.options.loginEndpoint,
				credentials,
			)

			this.handleAuthSuccess(response.data)
			await this.fetchUser()
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error))
			this.setState({
				loading: false,
				error: err,
			})
			throw err
		}
	}

	/**
	 * Logout the user
	 */
	async logout(): Promise<void> {
		const { token } = this.getState()

		if (token) {
			try {
				await this.httpClient.post(this.options.logoutEndpoint)
			} catch (error) {
				// Ignore errors when logging out
			}
		}

		this.clearAuthData()
	}

	/**
	 * Fetch the current user
	 */
	async fetchUser(): Promise<any> {
		this.setState({
			loading: true,
			error: null,
		})

		try {
			const response = await this.httpClient.get(
				this.options.getUserEndpoint,
			)

			this.setState({
				user: response.data,
				loading: false,
				authenticated: true,
			})

			return response.data
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error))
			this.setState({
				loading: false,
				error: err,
			})
			throw err
		}
	}

	/**
	 * Refresh the token
	 */
	async refreshToken(): Promise<string> {
		const { tokenStorage, refreshTokenKey } = this.options
		const refreshToken = tokenStorage.getItem(refreshTokenKey)

		if (!refreshToken) {
			throw new Error('No refresh token available')
		}

		try {
			const response = await this.httpClient.post<AuthTokenResponse>(
				this.options.refreshEndpoint,
				{ refreshToken },
			)

			this.handleAuthSuccess(response.data)
			return response.data.token
		} catch (error) {
			// If refresh fails, clear auth data
			this.clearAuthData()
			throw error
		}
	}

	/**
	 * Handle successful authentication
	 */
	private handleAuthSuccess(data: AuthTokenResponse): void {
		const { tokenStorage, tokenKey, refreshTokenKey } = this.options

		tokenStorage.setItem(tokenKey, data.token)

		if (data.refreshToken) {
			tokenStorage.setItem(refreshTokenKey, data.refreshToken)
		}

		this.setState({
			token: data.token,
			authenticated: true,
			loading: false,
			error: null,
		})
	}

	/**
	 * Clear authentication data
	 */
	private clearAuthData(): void {
		const { tokenStorage, tokenKey, refreshTokenKey } = this.options

		tokenStorage.removeItem(tokenKey)
		tokenStorage.removeItem(refreshTokenKey)

		this.setState(createInitialAuthState())
	}
}

/**
 * Creates an auth store
 */
export const createAuthStore = (options: AuthOptions): AuthStore => {
	return new AuthStore(options)
}
