import type { createFixture } from '@/utils'
import { server } from './server'

export function client() {
	return 'client'
}

server()

export type Fixture2 = ReturnType<typeof createFixture>
