const fastify = require("fastify")({ logger: true })
require("dotenv").config()

const fs = require("fs")
const path = require("path")

function walk(dir) {
	const results = []
	const list = fs.readdirSync(dir)

	list.forEach(file => {
		if(file.startsWith(".trash")) return // skip the trash folder

		file = path.join(dir, file)
		const stat = fs.statSync(file)

		if(stat && stat.isDirectory()) results.push(...walk(file))
		else results.push(file.replace(process.env.STORAGE_PATH, "").replace(/^\//, "")) // remove the storage path and leading slash
	})

	return results
}

function validatePath(userPath, basePath) {
	// First detection method
	try {
		const normalizedUserPath = path.normalize(userPath)

		const fullPath = path.resolve(basePath, normalizedUserPath)
		const normalizedBasePath = path.resolve(basePath)

		// String is suspect (= false) if it manage to escape the base path
		if(!fullPath.startsWith(normalizedBasePath + path.sep) && fullPath !== normalizedBasePath) return false
	} catch (error) {
		return false // Fallback to false if any error occurs
	}

	// Second detection method
	const normalizedPath = userPath.replace(/\\/g, "/") // replace Windows backslashes with Unix slashes
	const pathSegments = normalizedPath.split("/")
	for (const segment of pathSegments) {
		if (segment === ".." || segment === "." || segment.includes("..") || segment.includes(".trash")) return false
		if (segment === "" && pathSegments.indexOf(segment) > 0) return false // prevent empty segments in the middle of the path
	}

	return true // If no suspicious patterns are found, return true
}

async function main(){
	fastify.setNotFoundHandler((req, res) => {
		res.status(404).send({ statusCode: 404, error: "Not Found", message: "This endpoint doesn't exist" })
	})

	console.log("Starting server...")
	fastify.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" }, (err) => {
		if(err) console.error(err) && process.exit(1)

		console.log(`Server started on port ${fastify.server.address().port}`)
	})
}
main()

fastify.addHook("onRequest", (req, res, done) => { // check auth
	if(!req.headers.authorization) return res.status(401).send({ statusCode: 401, error: "Unauthorized", message: "authorization header isn't provided" })
	if(req.headers.authorization != process.env.AUTH_PASSWORD) return res.status(401).send({ statusCode: 401, erroa: "Unauthorized", message: "Authorization header isn't valid, check the .env file if you're the admin of this instance" })

	done()
})

fastify.get("/", async (req, res) => {
	res.status(200).send({ statusCode: 200, message: "Obsidian Inbox API is running", version: require("./package.json").version })
})

// Get the new files to store
fastify.get("/files", async (req, res) => {
	if(!fs.existsSync(path.join(process.env.STORAGE_PATH))) return res.status(404).send({ statusCode: 404, error: "Not Found", message: "No files to store" })

	const files = walk(process.env.STORAGE_PATH)
	if(!files.length) return res.status(404).send({ statusCode: 404, error: "Not Found", message: "No files to store" })

	const fileList = files.map(file => ({
		name: file,
		content: fs.readFileSync(path.join(process.env.STORAGE_PATH, file), "utf8")
	}))

	res.status(200).send({ statusCode: 200, files: fileList })
})

// Store a new file
fastify.post("/store", async (req, res) => {
	const files = req.body?.files
	if(!files || !Array.isArray(files)) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: "Files must be supplied and be defined as an array" })

	if(!fs.existsSync(path.join(process.env.STORAGE_PATH))) fs.mkdirSync(process.env.STORAGE_PATH, { recursive: true })

	for(const file of files){
		var index = files.indexOf(file)

		if(!file.name) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is missing required field: name` })
		if(!file.content) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is missing required field: content` })

		if(!path.extname(file.name)) file.name += ".md"
		if(!["md", "mdx", "txt", "csv"].includes(path.extname(file.name).slice(1))) {
			return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} has an unsupported extension: ${path.extname(file.name)}` })
		}

		if(file.name.startsWith("./")) file.name = file.name.slice(2)
		if(file.name.startsWith(".\\")) file.name = file.name.slice(2)
		if(file.name.startsWith("/")) file.name = file.name.slice(1)
		if(file.name.startsWith("\\")) file.name = file.name.slice(1)
		if(file.name.includes("../") || file.name.includes("..\\")) file.name = file.name.replace(/(\.\.\/|\.\.\\)/g, "") // remove any ../ or ..\ to prevent path traversal

		if(validatePath(file.name, process.env.STORAGE_PATH) != true) {
			return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} has an invalid path: ${file.name}` })
		}

		if(file.name.startsWith(".trash") || file.name.split(path.sep)[0] == ".trash") {
			return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} cannot be stored in the trash folder` })
		}

		if(!file.force && fs.existsSync(path.join(process.env.STORAGE_PATH, file.name))) {
			return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is already present on disk. You can overwrite the file by defining 'force' to true` })
		}

		if(!fs.existsSync(path.join(process.env.STORAGE_PATH, file.name, ".."))) {
			fs.mkdirSync(path.join(process.env.STORAGE_PATH, file.name, ".."), { recursive: true })
		}

		fs.writeFileSync(path.join(process.env.STORAGE_PATH, file.name), file.content, { flag: file.force ? "w" : "wx" }) // "w" to overwrite, "wx" to fail if the file already exists
	}

	res.status(files.length ? 201 : 200).send({ statusCode: files.length ? 201 : 200, message: `${files.length} file${files.length > 1 ? "s" : ""} stored successfully` })
})

// Delete a file from the store
fastify.delete("/delete", async (req, res) => {
	const files = req.body?.files
	if(!files || !Array.isArray(files)) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: "Files must be supplied and be defined as an array" })

	if(!fs.existsSync(path.join(process.env.STORAGE_PATH))) return res.status(404).send({ statusCode: 404, error: "Not Found", message: "No files to delete" })
	if(!fs.existsSync(path.join(process.env.STORAGE_PATH, ".trash"))) fs.mkdirSync(path.join(process.env.STORAGE_PATH, ".trash"), { recursive: true })

	var operations = []

	for(const file of files){
		var index = files.indexOf(file)

		if(!file) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is missing inside the body` })
		if(typeof file != "string") return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is not a string` })

		if(validatePath(file, process.env.STORAGE_PATH) != true) {
			return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} has an invalid path: ${file}` })
		}

		if(!fs.existsSync(path.join(process.env.STORAGE_PATH, file))) {
			return res.status(404).send({ statusCode: 404, error: "Not Found", message: `File #${index + 1} does not exist on disk` })
		}

		var inTrashPath = path.join(process.env.STORAGE_PATH, ".trash", file)
		try {
			if(fs.statSync(inTrashPath).isDirectory()) return res.status(400).send({ statusCode: 400, error: "Bad Request", message: `File #${index + 1} is a folder` })
		} catch (err) {}

		// Avoid having multiple files with the same name in the trash
		var i = 0
		const originalTrashPath = inTrashPath
		while(fs.existsSync(inTrashPath)) {
			i++

			const ext = path.extname(originalTrashPath)
			const nameWithoutExt = originalTrashPath.slice(0, -ext.length)

			const match = nameWithoutExt.match(/^(.+)-(\d+)$/) // if there is already a number at the end of the name
			if (match) inTrashPath = `${match[1]}-${i}${ext}`
			else inTrashPath = `${nameWithoutExt}-${i}${ext}`
		}

		if(!fs.existsSync(path.join(inTrashPath, ".."))) fs.mkdirSync(path.join(inTrashPath, ".."), { recursive: true })

		operations.push({
			index,
			from: path.join(process.env.STORAGE_PATH, file),
			to: inTrashPath
		})
	}

	// Remove duplicates based on 'from' and 'to' paths
	operations = operations.filter((operation, index, arr) => {
		const firstFromIndex = arr.findIndex(op => op.from === operation.from)
		const firstToIndex = arr.findIndex(op => op.to === operation.to)

		if (firstFromIndex !== index || firstToIndex !== index) {
			console.warn(`File #${operation.index + 1} is duplicate, skipping...`)
			return false
		}
		return true
	})

	for(const operation of operations){
		try {
			fs.renameSync(operation.from, operation.to) // move the file to the trash
		} catch (err) {
			console.error(`Error deleting file #${operation.index + 1}:`, err)
			return res.status(500).send({ statusCode: 500, error: "Internal Server Error", message: `Failed to delete file #${operation.index + 1}` })
		}
		console.log(`File #${operation.index + 1} moved to trash successfully`)
	}

	res.status(files.length ? 200 : 204).send({ statusCode: files.length ? 200 : 204, message: `${files.length} file${files.length > 1 ? "s" : ""} deleted successfully` })
})