import { accessSync, existsSync, unlinkSync } from 'fs'

import { resolve } from 'path'
import { spawnSync } from 'child_process'

interface FilesystemInterface {
    find(file: string): string
    exists(file: string): boolean
    isWindows(): boolean
}

abstract class AbstractFilesystem {
    platform = process.platform

    isWindows(): boolean {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(this.platform)
    }

    protected normalize(buffer: Buffer) {
        return buffer
            .toString()
            .replace('/\r\n/', '\n')
            .split('\n')
            .shift()
            .trim()
    }
}

class Windows extends AbstractFilesystem implements FilesystemInterface {
    extensions = ['.bat', '.exe', '.cmd', '']

    find(file: string): string {
        const exists = this.getExists(file)

        if (exists) {
            return exists
        }

        for (const extension of this.extensions) {
            const fileName = `${file}${extension}`
            try {
                const process = spawnSync('where', [fileName])

                if (process.status === 0) {
                    return this.normalize(new Buffer(process.output.join('')))
                }
            } catch (e) {}
        }

        return ''
    }

    exists(file: string): boolean {
        for (const extension of this.extensions) {
            if (existsSync(`${file}${extension}`)) {
                return true
            }
        }

        return false
    }

    private getExists(file: string): string {
        for (const extension of this.extensions) {
            if (existsSync(`${file}${extension}`)) {
                return resolve(`${file}${extension}`)
            }
        }

        return ''
    }
}

class Linux extends AbstractFilesystem implements FilesystemInterface {
    find(fileName: string): string {
        if (existsSync(fileName)) {
            return resolve(fileName)
        }

        const process = spawnSync('which', [fileName])

        return this.normalize(new Buffer(process.output.join('')))
    }

    exists(file: string): boolean {
        return existsSync(file)
    }
}

export class Filesystem extends AbstractFilesystem {
    private instance: FilesystemInterface

    private cache = new Map<string, string>()

    constructor() {
        super()
        this.instance = this.isWindows() ? new Windows() : new Linux()
    }

    find(file: string): string {
        const key = file
        if (this.cache.has(key) === true) {
            return this.cache.get(key)
        }

        const find = this.instance.find(key)
        if (find) {
            this.cache.set(key, find)
        }

        return find ? find : ''
    }

    exists(file: string): boolean {
        const key = `${file}-exists`
        if (this.cache.has(key) === true) {
            return true
        }

        const exists = this.instance.exists(file)
        if (exists === true) {
            this.cache.set(key, file)
        }

        return exists
    }

    unlink(file: string): void {
        try {
            if (existsSync(file) === true) {
                if (accessSync(file)) {
                    unlinkSync(file)
                } else {
                    setTimeout(() => {
                        this.unlink(file)
                    }, 500)
                }
            }
        } catch (e) {
            this.unlink(file)
        }
    }
}
