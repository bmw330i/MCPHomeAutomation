# Documents MCP Server

A Model Context Protocol (MCP) server that provides secure, read-only access to a user's Documents folder on macOS and Windows systems.

## Overview

This MCP server allows AI assistants to safely browse, read, and search through documents in a user's Documents folder. It enforces strict security by only allowing access to the Documents directory and preventing directory traversal attacks.

## Features

- 🔒 **Secure Access**: Only allows access to the Documents folder
- 📁 **Cross-Platform**: Works on macOS (`/Users/<username>/Documents`) and Windows (`C:\Users\<username>\Documents`)
- 📄 **File Operations**: List, read, and search documents
- 🔍 **Content Search**: Search within document contents
- 📊 **Metadata**: Get detailed file information
- ⚡ **Performance**: Configurable file size limits and result limits

## Installation

1. **Install dependencies:**
   ```bash
   cd documents-mcp-server
   npm install
   ```

2. **Configure environment (optional):**
   ```bash
   # Copy from project root .env or set these variables:
   export MAX_DOCUMENT_SIZE=10485760  # 10MB default
   export ALLOWED_DOCUMENT_EXTENSIONS=".txt,.md,.pdf,.doc,.docx"
   export LOG_LEVEL=info
   ```

## Usage

### Available Tools

#### `list_documents`
List files and folders in the Documents directory.

**Parameters:**
- `path` (optional): Subpath within Documents folder
- `include_hidden` (optional): Include hidden files (default: false)
- `recursive` (optional): List files recursively (default: false)

**Example:**
```json
{
  "path": "projects",
  "recursive": true
}
```

#### `read_document`
Read the contents of a document file.

**Parameters:**
- `path` (required): Path to the document file within Documents folder
- `encoding` (optional): Text encoding (default: "utf8")
- `max_lines` (optional): Maximum lines to read (default: unlimited)

**Example:**
```json
{
  "path": "notes/todo.txt",
  "max_lines": 50
}
```

#### `search_documents`
Search for documents by name or content.

**Parameters:**
- `query` (required): Search query
- `search_type` (optional): "filename" or "content" (default: "filename")
- `path` (optional): Subpath to search within
- `case_sensitive` (optional): Case sensitive search (default: false)
- `max_results` (optional): Maximum results (default: 50)

**Example:**
```json
{
  "query": "meeting notes",
  "search_type": "content",
  "max_results": 10
}
```

#### `get_document_info`
Get detailed information about a document.

**Parameters:**
- `path` (required): Path to the document within Documents folder

#### `check_documents_access`
Verify access to the Documents folder and show configuration.

## Security Features

- **Path Validation**: Only allows access within the Documents folder
- **Directory Traversal Protection**: Prevents `../` attacks
- **File Size Limits**: Configurable maximum file size (default: 10MB)
- **Extension Filtering**: Optional file type restrictions
- **Read-Only Access**: No write, delete, or modify operations

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCUMENTS_SERVER_NAME` | Server name | `documents-mcp-server` |
| `DOCUMENTS_SERVER_VERSION` | Server version | `1.0.0` |
| `MAX_DOCUMENT_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `ALLOWED_DOCUMENT_EXTENSIONS` | Comma-separated extensions | (none - all allowed) |
| `LOG_LEVEL` | Logging level | `info` |

### Platform Support

- **macOS**: `/Users/<username>/Documents`
- **Windows**: `C:\Users\<username>\Documents`
- **Linux**: `/home/<username>/Documents`

## Error Handling

The server provides clear error messages for common issues:

- **Access Denied**: Attempting to access files outside Documents
- **File Not Found**: Requested file doesn't exist
- **File Too Large**: File exceeds size limit
- **Invalid Encoding**: File cannot be read with specified encoding
- **Directory Traversal**: Attempting to use `../` in paths

## Examples

### List all documents
```bash
# Lists files in root Documents folder
list_documents
```

### Read a specific file
```bash
# Read a text file
read_document path="notes/important.txt"
```

### Search for files
```bash
# Find files with "report" in the name
search_documents query="report" search_type="filename"
```

### Search within files
```bash
# Find files containing "meeting agenda"
search_documents query="meeting agenda" search_type="content"
```

## Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "documents": {
      "command": "node",
      "args": ["/path/to/documents-mcp-server/index.mjs"]
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"Documents folder not found"**
   - Ensure the Documents folder exists in your home directory
   - Check permissions on the Documents folder

2. **"Access denied" errors**
   - The server only allows access to the Documents folder
   - Check that your path doesn't include `../` or absolute paths

3. **"File too large" errors**
   - Increase `MAX_DOCUMENT_SIZE` environment variable
   - Or use `max_lines` parameter to read partial files

4. **Encoding errors**
   - Try different encoding: `encoding="latin1"` or `encoding="ascii"`
   - Some binary files cannot be read as text

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
```

## Contributing

This server is designed to be secure and lightweight. Contributions should focus on:

- Security improvements
- Performance optimizations
- Cross-platform compatibility
- Additional metadata features

## License

MIT License - see project root for details.