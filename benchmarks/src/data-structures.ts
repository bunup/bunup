/**
 * Advanced Data Structures and Algorithms Implementation
 * A comprehensive collection of data structures with TypeScript generics
 */

// Basic utility types
export type Comparator<T> = (a: T, b: T) => number
export type Predicate<T> = (item: T) => boolean
export type Mapper<T, R> = (item: T) => R
export type Reducer<T, R> = (accumulator: R, value: T) => R

/**
 * Creates a default comparator for comparable objects
 */
export function defaultComparator<T>(a: T, b: T): number {
	if (a < b) return -1
	if (a > b) return 1
	return 0
}

/**
 * Creates an inverse of the provided comparator
 */
export function inverseComparator<T>(comparator: Comparator<T>): Comparator<T> {
	return (a: T, b: T) => -comparator(a, b)
}

/**
 * Node implementation for linked data structures
 */
export class Node<T> {
	public value: T
	public next: Node<T> | null

	constructor(value: T) {
		this.value = value
		this.next = null
	}
}

/**
 * Doubly linked node implementation
 */
export class DoublyNode<T> extends Node<T> {
	public prev: DoublyNode<T> | null

	constructor(value: T) {
		super(value)
		this.prev = null
		this.next = null
	}
}

/**
 * Linked List implementation
 */
export class LinkedList<T> {
	private head: Node<T> | null
	private tail: Node<T> | null
	private _size: number

	constructor() {
		this.head = null
		this.tail = null
		this._size = 0
	}

	/**
	 * Returns the number of elements in the list
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the list is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Adds an element to the end of the list
	 */
	append(value: T): void {
		const newNode = new Node<T>(value)

		if (!this.head) {
			this.head = newNode
			this.tail = newNode
		} else {
			if (this.tail) {
				this.tail.next = newNode
				this.tail = newNode
			}
		}

		this._size++
	}

	/**
	 * Adds an element to the beginning of the list
	 */
	prepend(value: T): void {
		const newNode = new Node<T>(value)

		if (!this.head) {
			this.head = newNode
			this.tail = newNode
		} else {
			newNode.next = this.head
			this.head = newNode
		}

		this._size++
	}

	/**
	 * Removes the first occurrence of a value from the list
	 */
	remove(value: T): boolean {
		if (!this.head) return false

		if (this.head.value === value) {
			this.head = this.head.next
			this._size--
			if (this._size === 0) {
				this.tail = null
			}
			return true
		}

		let current = this.head
		while (current.next) {
			if (current.next.value === value) {
				if (current.next === this.tail) {
					this.tail = current
				}
				current.next = current.next.next
				this._size--
				return true
			}
			current = current.next
		}

		return false
	}

	/**
	 * Converts the list to an array
	 */
	toArray(): T[] {
		const result: T[] = []
		let current = this.head

		while (current) {
			result.push(current.value)
			current = current.next
		}

		return result
	}

	/**
	 * Finds the first element that satisfies the predicate
	 */
	find(predicate: Predicate<T>): T | null {
		let current = this.head

		while (current) {
			if (predicate(current.value)) {
				return current.value
			}
			current = current.next
		}

		return null
	}

	/**
	 * Maps each element of the list to a new value
	 */
	map<R>(mapper: Mapper<T, R>): LinkedList<R> {
		const result = new LinkedList<R>()
		let current = this.head

		while (current) {
			result.append(mapper(current.value))
			current = current.next
		}

		return result
	}

	/**
	 * Filters elements based on a predicate
	 */
	filter(predicate: Predicate<T>): LinkedList<T> {
		const result = new LinkedList<T>()
		let current = this.head

		while (current) {
			if (predicate(current.value)) {
				result.append(current.value)
			}
			current = current.next
		}

		return result
	}

	/**
	 * Reduces the list to a single value
	 */
	reduce<R>(reducer: Reducer<T, R>, initialValue: R): R {
		let result = initialValue
		let current = this.head

		while (current) {
			result = reducer(result, current.value)
			current = current.next
		}

		return result
	}
}

/**
 * Doubly Linked List implementation
 */
export class DoublyLinkedList<T> {
	private head: DoublyNode<T> | null
	private tail: DoublyNode<T> | null
	private _size: number

	constructor() {
		this.head = null
		this.tail = null
		this._size = 0
	}

	/**
	 * Returns the number of elements in the list
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the list is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Adds an element to the end of the list
	 */
	append(value: T): void {
		const newNode = new DoublyNode<T>(value)

		if (!this.head) {
			this.head = newNode
			this.tail = newNode
		} else {
			if (this.tail) {
				this.tail.next = newNode
				newNode.prev = this.tail
				this.tail = newNode
			}
		}

		this._size++
	}

	/**
	 * Adds an element to the beginning of the list
	 */
	prepend(value: T): void {
		const newNode = new DoublyNode<T>(value)

		if (!this.head) {
			this.head = newNode
			this.tail = newNode
		} else {
			newNode.next = this.head
			this.head.prev = newNode
			this.head = newNode
		}

		this._size++
	}

	/**
	 * Removes the first occurrence of a value from the list
	 */
	remove(value: T): boolean {
		if (!this.head) return false

		if (this.head.value === value) {
			this.head = this.head.next as DoublyNode<T>
			if (this.head) {
				this.head.prev = null
			} else {
				this.tail = null
			}
			this._size--
			return true
		}

		let current = this.head
		while (current) {
			if (current.value === value) {
				if (current.prev) {
					current.prev.next = current.next
				}
				if (current.next) {
					;(current.next as DoublyNode<T>).prev = current.prev
				}
				if (current === this.tail) {
					this.tail = current.prev
				}
				this._size--
				return true
			}
			current = current.next as DoublyNode<T>
		}

		return false
	}

	/**
	 * Converts the list to an array
	 */
	toArray(): T[] {
		const result: T[] = []
		let current = this.head

		while (current) {
			result.push(current.value)
			current = current.next as DoublyNode<T>
		}

		return result
	}

	/**
	 * Converts the list to an array in reverse order
	 */
	toReverseArray(): T[] {
		const result: T[] = []
		let current = this.tail

		while (current) {
			result.push(current.value)
			current = current.prev
		}

		return result
	}

	/**
	 * Maps each element of the list to a new value
	 */
	map<R>(mapper: Mapper<T, R>): DoublyLinkedList<R> {
		const result = new DoublyLinkedList<R>()
		let current = this.head

		while (current) {
			result.append(mapper(current.value))
			current = current.next as DoublyNode<T>
		}

		return result
	}
}

/**
 * Stack implementation using linked list
 */
export class Stack<T> {
	private list: LinkedList<T>

	constructor() {
		this.list = new LinkedList<T>()
	}

	/**
	 * Returns the number of elements in the stack
	 */
	get size(): number {
		return this.list.size
	}

	/**
	 * Checks if the stack is empty
	 */
	isEmpty(): boolean {
		return this.list.isEmpty()
	}

	/**
	 * Adds an element to the top of the stack
	 */
	push(value: T): void {
		this.list.prepend(value)
	}

	/**
	 * Removes and returns the top element from the stack
	 */
	pop(): T | null {
		if (this.isEmpty()) return null

		const array = this.list.toArray()
		const value = array[0]
		this.list.remove(value)

		return value
	}

	/**
	 * Returns the top element without removing it
	 */
	peek(): T | null {
		if (this.isEmpty()) return null

		const array = this.list.toArray()
		return array[0]
	}

	/**
	 * Converts the stack to an array
	 */
	toArray(): T[] {
		return this.list.toArray()
	}
}

/**
 * Queue implementation using linked list
 */
export class Queue<T> {
	private list: LinkedList<T>

	constructor() {
		this.list = new LinkedList<T>()
	}

	/**
	 * Returns the number of elements in the queue
	 */
	get size(): number {
		return this.list.size
	}

	/**
	 * Checks if the queue is empty
	 */
	isEmpty(): boolean {
		return this.list.isEmpty()
	}

	/**
	 * Adds an element to the end of the queue
	 */
	enqueue(value: T): void {
		this.list.append(value)
	}

	/**
	 * Removes and returns the front element from the queue
	 */
	dequeue(): T | null {
		if (this.isEmpty()) return null

		const array = this.list.toArray()
		const value = array[0]
		this.list.remove(value)

		return value
	}

	/**
	 * Returns the front element without removing it
	 */
	peek(): T | null {
		if (this.isEmpty()) return null

		const array = this.list.toArray()
		return array[0]
	}

	/**
	 * Converts the queue to an array
	 */
	toArray(): T[] {
		return this.list.toArray()
	}
}

/**
 * Binary Tree Node implementation
 */
export class BinaryTreeNode<T> {
	public value: T
	public left: BinaryTreeNode<T> | null
	public right: BinaryTreeNode<T> | null

	constructor(value: T) {
		this.value = value
		this.left = null
		this.right = null
	}
}

/**
 * Binary Search Tree implementation
 */
export class BinarySearchTree<T> {
	private root: BinaryTreeNode<T> | null
	private _size: number
	private comparator: Comparator<T>

	constructor(comparator: Comparator<T> = defaultComparator) {
		this.root = null
		this._size = 0
		this.comparator = comparator
	}

	/**
	 * Returns the number of nodes in the tree
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the tree is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Inserts a value into the tree
	 */
	insert(value: T): void {
		if (!this.root) {
			this.root = new BinaryTreeNode<T>(value)
			this._size++
			return
		}

		const insertNode = (node: BinaryTreeNode<T>, value: T): void => {
			const compareResult = this.comparator(value, node.value)

			if (compareResult < 0) {
				if (node.left === null) {
					node.left = new BinaryTreeNode<T>(value)
					this._size++
				} else {
					insertNode(node.left, value)
				}
			} else {
				if (node.right === null) {
					node.right = new BinaryTreeNode<T>(value)
					this._size++
				} else {
					insertNode(node.right, value)
				}
			}
		}

		insertNode(this.root, value)
	}

	/**
	 * Checks if the tree contains a value
	 */
	contains(value: T): boolean {
		if (!this.root) return false

		let current = this.root

		while (current) {
			const compareResult = this.comparator(value, current.value)

			if (compareResult === 0) {
				return true
			}
			if (compareResult < 0) {
				current = current.left as BinaryTreeNode<T>
			} else {
				current = current.right as BinaryTreeNode<T>
			}
		}

		return false
	}

	/**
	 * Performs an in-order traversal of the tree
	 */
	inOrderTraversal(callback: (value: T) => void): void {
		const traverse = (node: BinaryTreeNode<T> | null): void => {
			if (node) {
				traverse(node.left)
				callback(node.value)
				traverse(node.right)
			}
		}

		traverse(this.root)
	}

	/**
	 * Performs a pre-order traversal of the tree
	 */
	preOrderTraversal(callback: (value: T) => void): void {
		const traverse = (node: BinaryTreeNode<T> | null): void => {
			if (node) {
				callback(node.value)
				traverse(node.left)
				traverse(node.right)
			}
		}

		traverse(this.root)
	}

	/**
	 * Performs a post-order traversal of the tree
	 */
	postOrderTraversal(callback: (value: T) => void): void {
		const traverse = (node: BinaryTreeNode<T> | null): void => {
			if (node) {
				traverse(node.left)
				traverse(node.right)
				callback(node.value)
			}
		}

		traverse(this.root)
	}

	/**
	 * Converts the tree to an array using in-order traversal
	 */
	toArray(): T[] {
		const result: T[] = []
		this.inOrderTraversal((value) => result.push(value))
		return result
	}

	/**
	 * Finds the minimum value in the tree
	 */
	findMin(): T | null {
		if (!this.root) return null

		let current = this.root
		while (current.left) {
			current = current.left
		}

		return current.value
	}

	/**
	 * Finds the maximum value in the tree
	 */
	findMax(): T | null {
		if (!this.root) return null

		let current = this.root
		while (current.right) {
			current = current.right
		}

		return current.value
	}

	/**
	 * Finds the height of the tree
	 */
	getHeight(): number {
		const calculateHeight = (node: BinaryTreeNode<T> | null): number => {
			if (!node) return -1

			const leftHeight = calculateHeight(node.left)
			const rightHeight = calculateHeight(node.right)

			return Math.max(leftHeight, rightHeight) + 1
		}

		return calculateHeight(this.root)
	}

	/**
	 * Removes a value from the tree
	 */
	remove(value: T): boolean {
		if (!this.root) return false

		let found = false

		const removeNode = (
			node: BinaryTreeNode<T> | null,
			value: T,
		): BinaryTreeNode<T> | null => {
			if (!node) return null

			const compareResult = this.comparator(value, node.value)

			if (compareResult < 0) {
				node.left = removeNode(node.left, value)
			} else if (compareResult > 0) {
				node.right = removeNode(node.right, value)
			} else {
				found = true
				this._size--

				// Node with no children
				if (!node.left && !node.right) {
					return null
				}

				// Node with one child
				if (!node.left) {
					return node.right
				}

				if (!node.right) {
					return node.left
				}

				// Node with two children
				// Find the minimum value in the right subtree
				let successorParent = node
				let successor = node.right

				while (successor.left) {
					successorParent = successor
					successor = successor.left
				}

				if (successorParent !== node) {
					successorParent.left = successor.right
					successor.right = node.right
				}

				successor.left = node.left

				return successor
			}

			return node
		}

		this.root = removeNode(this.root, value)

		return found
	}
}

/**
 * AVL Tree Node implementation
 */
export class AVLTreeNode<T> {
	public value: T
	public left: AVLTreeNode<T> | null
	public right: AVLTreeNode<T> | null
	public height: number

	constructor(value: T) {
		this.value = value
		this.left = null
		this.right = null
		this.height = 1
	}
}

/**
 * AVL Tree implementation (self-balancing binary search tree)
 */
export class AVLTree<T> {
	private root: AVLTreeNode<T> | null
	private _size: number
	private comparator: Comparator<T>

	constructor(comparator: Comparator<T> = defaultComparator) {
		this.root = null
		this._size = 0
		this.comparator = comparator
	}

	/**
	 * Returns the number of nodes in the tree
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the tree is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Gets the height of a node
	 */
	private getHeight(node: AVLTreeNode<T> | null): number {
		return node ? node.height : 0
	}

	/**
	 * Gets the balance factor of a node
	 */
	private getBalanceFactor(node: AVLTreeNode<T>): number {
		return this.getHeight(node.left) - this.getHeight(node.right)
	}

	/**
	 * Updates the height of a node
	 */
	private updateHeight(node: AVLTreeNode<T>): void {
		node.height =
			Math.max(this.getHeight(node.left), this.getHeight(node.right)) + 1
	}

	/**
	 * Right rotation
	 */
	private rotateRight(y: AVLTreeNode<T>): AVLTreeNode<T> {
		const x = y.left as AVLTreeNode<T>
		const T2 = x.right

		x.right = y
		y.left = T2

		this.updateHeight(y)
		this.updateHeight(x)

		return x
	}

	/**
	 * Left rotation
	 */
	private rotateLeft(x: AVLTreeNode<T>): AVLTreeNode<T> {
		const y = x.right as AVLTreeNode<T>
		const T2 = y.left

		y.left = x
		x.right = T2

		this.updateHeight(x)
		this.updateHeight(y)

		return y
	}

	/**
	 * Inserts a value into the tree
	 */
	insert(value: T): void {
		const insertNode = (
			node: AVLTreeNode<T> | null,
			value: T,
		): AVLTreeNode<T> => {
			if (!node) {
				this._size++
				return new AVLTreeNode<T>(value)
			}

			const compareResult = this.comparator(value, node.value)

			if (compareResult < 0) {
				node.left = insertNode(node.left, value)
			} else {
				node.right = insertNode(node.right, value)
			}

			this.updateHeight(node)

			const balanceFactor = this.getBalanceFactor(node)

			// Left Left Case
			if (
				balanceFactor > 1 &&
				node.left &&
				this.comparator(value, node.left.value) < 0
			) {
				return this.rotateRight(node)
			}

			// Right Right Case
			if (
				balanceFactor < -1 &&
				node.right &&
				this.comparator(value, node.right.value) > 0
			) {
				return this.rotateLeft(node)
			}

			// Left Right Case
			if (
				balanceFactor > 1 &&
				node.left &&
				this.comparator(value, node.left.value) > 0
			) {
				node.left = this.rotateLeft(node.left)
				return this.rotateRight(node)
			}

			// Right Left Case
			if (
				balanceFactor < -1 &&
				node.right &&
				this.comparator(value, node.right.value) < 0
			) {
				node.right = this.rotateRight(node.right)
				return this.rotateLeft(node)
			}

			return node
		}

		this.root = insertNode(this.root, value)
	}

	/**
	 * Checks if the tree contains a value
	 */
	contains(value: T): boolean {
		if (!this.root) return false

		let current = this.root

		while (current) {
			const compareResult = this.comparator(value, current.value)

			if (compareResult === 0) {
				return true
			}
			if (compareResult < 0) {
				current = current.left as AVLTreeNode<T>
			} else {
				current = current.right as AVLTreeNode<T>
			}
		}

		return false
	}

	/**
	 * Performs an in-order traversal of the tree
	 */
	inOrderTraversal(callback: (value: T) => void): void {
		const traverse = (node: AVLTreeNode<T> | null): void => {
			if (node) {
				traverse(node.left)
				callback(node.value)
				traverse(node.right)
			}
		}

		traverse(this.root)
	}

	/**
	 * Converts the tree to an array using in-order traversal
	 */
	toArray(): T[] {
		const result: T[] = []
		this.inOrderTraversal((value) => result.push(value))
		return result
	}

	/**
	 * Finds the minimum value in the tree
	 */
	findMin(): T | null {
		if (!this.root) return null

		let current = this.root
		while (current.left) {
			current = current.left
		}

		return current.value
	}

	/**
	 * Finds the maximum value in the tree
	 */
	findMax(): T | null {
		if (!this.root) return null

		let current = this.root
		while (current.right) {
			current = current.right
		}

		return current.value
	}
}

/**
 * Priority Queue implementation using binary heap
 */
export class PriorityQueue<T> {
	private heap: T[]
	private comparator: Comparator<T>

	constructor(comparator: Comparator<T> = defaultComparator) {
		this.heap = []
		this.comparator = comparator
	}

	/**
	 * Returns the number of elements in the queue
	 */
	get size(): number {
		return this.heap.length
	}

	/**
	 * Checks if the queue is empty
	 */
	isEmpty(): boolean {
		return this.size === 0
	}

	/**
	 * Gets the parent index
	 */
	private parent(index: number): number {
		return Math.floor((index - 1) / 2)
	}

	/**
	 * Gets the left child index
	 */
	private leftChild(index: number): number {
		return 2 * index + 1
	}

	/**
	 * Gets the right child index
	 */
	private rightChild(index: number): number {
		return 2 * index + 2
	}

	/**
	 * Swaps two elements in the heap
	 */
	private swap(i: number, j: number): void {
		;[this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]
	}

	/**
	 * Sifts an element up to maintain the heap property
	 */
	private siftUp(index: number): void {
		let current = index
		let parentIndex = this.parent(current)

		while (
			current > 0 &&
			this.comparator(this.heap[current], this.heap[parentIndex]) < 0
		) {
			this.swap(current, parentIndex)
			current = parentIndex
			parentIndex = this.parent(current)
		}
	}

	/**
	 * Sifts an element down to maintain the heap property
	 */
	private siftDown(index: number): void {
		let current = index
		let smallest = current
		const size = this.size

		while (true) {
			const leftIndex = this.leftChild(current)
			const rightIndex = this.rightChild(current)

			if (
				leftIndex < size &&
				this.comparator(this.heap[leftIndex], this.heap[smallest]) < 0
			) {
				smallest = leftIndex
			}

			if (
				rightIndex < size &&
				this.comparator(this.heap[rightIndex], this.heap[smallest]) < 0
			) {
				smallest = rightIndex
			}

			if (smallest === current) break

			this.swap(current, smallest)
			current = smallest
		}
	}

	/**
	 * Adds an element to the queue
	 */
	enqueue(value: T): void {
		this.heap.push(value)
		this.siftUp(this.size - 1)
	}

	/**
	 * Removes and returns the highest priority element
	 */
	dequeue(): T | null {
		if (this.isEmpty()) return null

		const result = this.heap[0]
		const last = this.heap.pop() as T

		if (this.size > 0) {
			this.heap[0] = last
			this.siftDown(0)
		}

		return result
	}

	/**
	 * Returns the highest priority element without removing it
	 */
	peek(): T | null {
		return this.isEmpty() ? null : this.heap[0]
	}

	/**
	 * Converts the queue to an array
	 */
	toArray(): T[] {
		return [...this.heap]
	}
}

/**
 * Hash table implementation
 */
export class HashTable<K, V> {
	private buckets: Array<Array<[K, V]>>
	private _size: number
	private readonly capacity: number

	constructor(capacity = 32) {
		this.buckets = new Array(capacity).fill(null).map(() => [])
		this._size = 0
		this.capacity = capacity
	}

	/**
	 * Returns the number of key-value pairs
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the hash table is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Hashes a key
	 */
	private hash(key: K): number {
		const str = String(key)
		let hash = 0

		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i)
			hash |= 0 // Convert to 32bit integer
		}

		return Math.abs(hash) % this.capacity
	}

	/**
	 * Sets a key-value pair
	 */
	set(key: K, value: V): void {
		const index = this.hash(key)
		const bucket = this.buckets[index]

		const entry = bucket.find(([k]) => k === key)

		if (entry) {
			entry[1] = value
		} else {
			bucket.push([key, value])
			this._size++
		}
	}

	/**
	 * Gets a value by key
	 */
	get(key: K): V | undefined {
		const index = this.hash(key)
		const bucket = this.buckets[index]

		const entry = bucket.find(([k]) => k === key)

		return entry ? entry[1] : undefined
	}

	/**
	 * Checks if a key exists
	 */
	has(key: K): boolean {
		const index = this.hash(key)
		const bucket = this.buckets[index]

		return bucket.some(([k]) => k === key)
	}

	/**
	 * Deletes a key-value pair
	 */
	delete(key: K): boolean {
		const index = this.hash(key)
		const bucket = this.buckets[index]

		const entryIndex = bucket.findIndex(([k]) => k === key)

		if (entryIndex >= 0) {
			bucket.splice(entryIndex, 1)
			this._size--
			return true
		}

		return false
	}

	/**
	 * Returns all keys
	 */
	keys(): K[] {
		return this.buckets.reduce((keys, bucket) => {
			return keys.concat(bucket.map(([k]) => k))
		}, [] as K[])
	}

	/**
	 * Returns all values
	 */
	values(): V[] {
		return this.buckets.reduce((values, bucket) => {
			return values.concat(bucket.map(([, v]) => v))
		}, [] as V[])
	}

	/**
	 * Returns all entries
	 */
	entries(): Array<[K, V]> {
		return this.buckets.reduce(
			(entries, bucket) => {
				return entries.concat(bucket)
			},
			[] as Array<[K, V]>,
		)
	}

	/**
	 * Clears the hash table
	 */
	clear(): void {
		this.buckets = new Array(this.capacity).fill(null).map(() => [])
		this._size = 0
	}
}

/**
 * Trie node implementation
 */
export class TrieNode {
	public children: Map<string, TrieNode>
	public isEndOfWord: boolean

	constructor() {
		this.children = new Map<string, TrieNode>()
		this.isEndOfWord = false
	}
}

/**
 * Trie implementation for strings
 */
export class Trie {
	private root: TrieNode
	private _size: number

	constructor() {
		this.root = new TrieNode()
		this._size = 0
	}

	/**
	 * Returns the number of words in the trie
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Checks if the trie is empty
	 */
	isEmpty(): boolean {
		return this._size === 0
	}

	/**
	 * Inserts a word into the trie
	 */
	insert(word: string): void {
		let current = this.root

		for (const char of word) {
			if (!current.children.has(char)) {
				current.children.set(char, new TrieNode())
			}
			current = current.children.get(char)!
		}

		if (!current.isEndOfWord) {
			current.isEndOfWord = true
			this._size++
		}
	}

	/**
	 * Searches for a word in the trie
	 */
	search(word: string): boolean {
		let current = this.root

		for (const char of word) {
			if (!current.children.has(char)) {
				return false
			}
			current = current.children.get(char)!
		}

		return current.isEndOfWord
	}

	/**
	 * Checks if a prefix exists in the trie
	 */
	startsWith(prefix: string): boolean {
		let current = this.root

		for (const char of prefix) {
			if (!current.children.has(char)) {
				return false
			}
			current = current.children.get(char)!
		}

		return true
	}

	/**
	 * Deletes a word from the trie
	 */
	delete(word: string): boolean {
		const deleteHelper = (
			node: TrieNode,
			word: string,
			index = 0,
		): boolean => {
			if (index === word.length) {
				if (!node.isEndOfWord) {
					return false
				}

				node.isEndOfWord = false
				this._size--

				return node.children.size === 0
			}

			const char = word[index]

			if (!node.children.has(char)) {
				return false
			}

			const shouldDeleteCurrentNode = deleteHelper(
				node.children.get(char)!,
				word,
				index + 1,
			)

			if (shouldDeleteCurrentNode) {
				node.children.delete(char)
				return node.children.size === 0 && !node.isEndOfWord
			}

			return false
		}

		return deleteHelper(this.root, word)
	}

	/**
	 * Returns all words in the trie
	 */
	getAllWords(): string[] {
		const result: string[] = []

		const traverse = (node: TrieNode, prefix: string): void => {
			if (node.isEndOfWord) {
				result.push(prefix)
			}

			for (const [char, childNode] of node.children) {
				traverse(childNode, prefix + char)
			}
		}

		traverse(this.root, '')

		return result
	}
}

/**
 * Graph node implementation
 */
export class GraphNode<T> {
	public value: T
	public edges: Set<GraphNode<T>>

	constructor(value: T) {
		this.value = value
		this.edges = new Set<GraphNode<T>>()
	}

	/**
	 * Adds an edge to another node
	 */
	addEdge(node: GraphNode<T>): void {
		this.edges.add(node)
	}

	/**
	 * Removes an edge to another node
	 */
	removeEdge(node: GraphNode<T>): boolean {
		return this.edges.delete(node)
	}

	/**
	 * Checks if this node has an edge to another node
	 */
	hasEdge(node: GraphNode<T>): boolean {
		return this.edges.has(node)
	}

	/**
	 * Returns all neighbors
	 */
	getNeighbors(): GraphNode<T>[] {
		return Array.from(this.edges)
	}
}

/**
 * Undirected graph implementation
 */
export class Graph<T> {
	private nodes: Map<T, GraphNode<T>>

	constructor() {
		this.nodes = new Map<T, GraphNode<T>>()
	}

	/**
	 * Returns the number of nodes
	 */
	get size(): number {
		return this.nodes.size
	}

	/**
	 * Checks if the graph is empty
	 */
	isEmpty(): boolean {
		return this.size === 0
	}

	/**
	 * Adds a node to the graph
	 */
	addNode(value: T): GraphNode<T> {
		if (!this.nodes.has(value)) {
			const newNode = new GraphNode<T>(value)
			this.nodes.set(value, newNode)
			return newNode
		}

		return this.nodes.get(value)!
	}

	/**
	 * Removes a node from the graph
	 */
	removeNode(value: T): boolean {
		const node = this.nodes.get(value)

		if (!node) return false

		// Remove all edges pointing to this node
		for (const otherNode of this.nodes.values()) {
			otherNode.removeEdge(node)
		}

		return this.nodes.delete(value)
	}

	/**
	 * Adds an edge between two nodes
	 */
	addEdge(value1: T, value2: T): void {
		const node1 = this.addNode(value1)
		const node2 = this.addNode(value2)

		node1.addEdge(node2)
		node2.addEdge(node1)
	}

	/**
	 * Removes an edge between two nodes
	 */
	removeEdge(value1: T, value2: T): boolean {
		const node1 = this.nodes.get(value1)
		const node2 = this.nodes.get(value2)

		if (!node1 || !node2) return false

		return node1.removeEdge(node2) && node2.removeEdge(node1)
	}

	/**
	 * Checks if an edge exists between two nodes
	 */
	hasEdge(value1: T, value2: T): boolean {
		const node1 = this.nodes.get(value1)
		const node2 = this.nodes.get(value2)

		if (!node1 || !node2) return false

		return node1.hasEdge(node2)
	}

	/**
	 * Returns all neighbors of a node
	 */
	getNeighbors(value: T): T[] {
		const node = this.nodes.get(value)

		if (!node) return []

		return node.getNeighbors().map((node) => node.value)
	}

	/**
	 * Performs a breadth-first search starting from a node
	 */
	bfs(startValue: T, callback: (value: T) => void): void {
		const startNode = this.nodes.get(startValue)

		if (!startNode) return

		const visited = new Set<GraphNode<T>>()
		const queue: GraphNode<T>[] = [startNode]

		visited.add(startNode)

		while (queue.length > 0) {
			const current = queue.shift()!
			callback(current.value)

			for (const neighbor of current.getNeighbors()) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor)
					queue.push(neighbor)
				}
			}
		}
	}

	/**
	 * Performs a depth-first search starting from a node
	 */
	dfs(startValue: T, callback: (value: T) => void): void {
		const startNode = this.nodes.get(startValue)

		if (!startNode) return

		const visited = new Set<GraphNode<T>>()

		const traverse = (node: GraphNode<T>): void => {
			visited.add(node)
			callback(node.value)

			for (const neighbor of node.getNeighbors()) {
				if (!visited.has(neighbor)) {
					traverse(neighbor)
				}
			}
		}

		traverse(startNode)
	}

	/**
	 * Returns all values in the graph
	 */
	getValues(): T[] {
		return Array.from(this.nodes.keys())
	}
}

// Sorting Algorithms
/**
 * Bubble sort implementation
 */
export function bubbleSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	const result = [...array]
	const n = result.length

	for (let i = 0; i < n - 1; i++) {
		for (let j = 0; j < n - i - 1; j++) {
			if (comparator(result[j], result[j + 1]) > 0) {
				;[result[j], result[j + 1]] = [result[j + 1], result[j]]
			}
		}
	}

	return result
}

/**
 * Selection sort implementation
 */
export function selectionSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	const result = [...array]
	const n = result.length

	for (let i = 0; i < n - 1; i++) {
		let minIndex = i

		for (let j = i + 1; j < n; j++) {
			if (comparator(result[j], result[minIndex]) < 0) {
				minIndex = j
			}
		}

		if (minIndex !== i) {
			;[result[i], result[minIndex]] = [result[minIndex], result[i]]
		}
	}

	return result
}

/**
 * Insertion sort implementation
 */
export function insertionSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	const result = [...array]
	const n = result.length

	for (let i = 1; i < n; i++) {
		const key = result[i]
		let j = i - 1

		while (j >= 0 && comparator(result[j], key) > 0) {
			result[j + 1] = result[j]
			j--
		}

		result[j + 1] = key
	}

	return result
}

/**
 * Merge sort implementation
 */
export function mergeSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	if (array.length <= 1) {
		return array
	}

	const merge = (left: T[], right: T[]): T[] => {
		const result: T[] = []
		let leftIndex = 0
		let rightIndex = 0

		while (leftIndex < left.length && rightIndex < right.length) {
			if (comparator(left[leftIndex], right[rightIndex]) <= 0) {
				result.push(left[leftIndex])
				leftIndex++
			} else {
				result.push(right[rightIndex])
				rightIndex++
			}
		}

		return result.concat(left.slice(leftIndex), right.slice(rightIndex))
	}

	const middle = Math.floor(array.length / 2)
	const left = array.slice(0, middle)
	const right = array.slice(middle)

	return merge(mergeSort(left, comparator), mergeSort(right, comparator))
}

/**
 * Quick sort implementation
 */
export function quickSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	if (array.length <= 1) {
		return array
	}

	const result = [...array]

	const partition = (arr: T[], low: number, high: number): number => {
		const pivot = arr[high]
		let i = low - 1

		for (let j = low; j < high; j++) {
			if (comparator(arr[j], pivot) <= 0) {
				i++
				;[arr[i], arr[j]] = [arr[j], arr[i]]
			}
		}
		;[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]

		return i + 1
	}

	const quickSortHelper = (arr: T[], low: number, high: number): void => {
		if (low < high) {
			const pivotIndex = partition(arr, low, high)

			quickSortHelper(arr, low, pivotIndex - 1)
			quickSortHelper(arr, pivotIndex + 1, high)
		}
	}

	quickSortHelper(result, 0, result.length - 1)

	return result
}

/**
 * Heap sort implementation
 */
export function heapSort<T>(
	array: T[],
	comparator: Comparator<T> = defaultComparator,
): T[] {
	const result = [...array]
	const n = result.length

	const heapify = (arr: T[], n: number, i: number): void => {
		let largest = i
		const left = 2 * i + 1
		const right = 2 * i + 2

		if (left < n && comparator(arr[left], arr[largest]) > 0) {
			largest = left
		}

		if (right < n && comparator(arr[right], arr[largest]) > 0) {
			largest = right
		}

		if (largest !== i) {
			;[arr[i], arr[largest]] = [arr[largest], arr[i]]
			heapify(arr, n, largest)
		}
	}

	// Build max heap
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
		heapify(result, n, i)
	}

	// Extract elements one by one
	for (let i = n - 1; i > 0; i--) {
		;[result[0], result[i]] = [result[i], result[0]]
		heapify(result, i, 0)
	}

	return result
}
