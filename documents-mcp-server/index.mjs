#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { homedir, platform } from 'os';
import dotenv from 'dotenv';

const __filename = import.meta.url;
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(dirname(__dirname), '.env') });

// Configuration
const CONFIG = {
  SERVER_NAME: process.env.DOCUMENTS_SERVER_NAME || 'documents-mcp-server',
  SERVER_VERSION: process.env.DOCUMENTS_SERVER_VERSION || '1.0.0',
  MAX_FILE_SIZE: parseInt(process.env.MAX_DOCUMENT_SIZE) || 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: process.env.ALLOWED_DOCUMENT_EXTENSIONS ?
    process.env.ALLOWED_DOCUMENT_EXTENSIONS.split(',') : null,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Get Documents folder path based on platform
function getDocumentsPath() {
  const home = homedir();

  switch (platform()) {
    case 'darwin': // macOS
      return join(home, 'Documents');
    case 'win32': // Windows
      return join(home, 'Documents');
    case 'linux':
      // Linux typically uses ~/Documents
      return join(home, 'Documents');
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

// Validate that path is within Documents folder
function validateDocumentsPath(requestedPath) {
  const documentsPath = getDocumentsPath();
  const fullPath = join(documentsPath, requestedPath);

  // Resolve to absolute paths for comparison
  const absDocumentsPath = documentsPath;
  const absRequestedPath = fullPath;

  // Check if the requested path is within the Documents folder
  if (!absRequestedPath.startsWith(absDocumentsPath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Access denied: Can only access files within the Documents folder. Requested: ${requestedPath}`
    );
  }

  // Additional security: prevent directory traversal
  if (requestedPath.includes('..') || requestedPath.includes('../')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Access denied: Directory traversal not allowed'
    );
  }

  return fullPath;
}

// Check if file extension is allowed
function isAllowedExtension(filename) {
  if (!CONFIG.ALLOWED_EXTENSIONS) return true;

  const ext = extname(filename).toLowerCase();
  return CONFIG.ALLOWED_EXTENSIONS.includes(ext);
}

// Format file size
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Get file metadata
async function getFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
      isDirectory: stats.isDirectory(),
      permissions: stats.mode.toString(8)
    };
  } catch (error) {
    return null;
  }
}

class DocumentsMCPServer {
  constructor() {
    this.documentsPath = getDocumentsPath();
    this.server = new Server(
      {
        name: CONFIG.SERVER_NAME,
        version: CONFIG.SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
    this.validateConfiguration();
  }

  validateConfiguration() {
    // Check if Documents folder exists
    try {
      // We'll check this asynchronously in the tools
      if (CONFIG.LOG_LEVEL === 'debug') {
        console.error(`[CONFIG] Documents path: ${this.documentsPath}`);
        console.error(`[CONFIG] Platform: ${platform()}`);
      }
    } catch (error) {
      throw new Error(`Documents folder configuration error: ${error.message}`);
    }
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_documents',
          description: 'List files and folders in the Documents directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Subpath within Documents folder (optional, defaults to root)',
              },
              include_hidden: {
                type: 'boolean',
                description: 'Include hidden files (starting with .)',
                default: false,
              },
              recursive: {
                type: 'boolean',
                description: 'List files recursively in subdirectories',
                default: false,
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'read_document',
          description: 'Read the contents of a document file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the document file within Documents folder',
              },
              encoding: {
                type: 'string',
                description: 'Text encoding (utf8, ascii, etc.)',
                default: 'utf8',
              },
              max_lines: {
                type: 'number',
                description: 'Maximum number of lines to read (0 = unlimited)',
                default: 0,
              },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
        {
          name: 'search_documents',
          description: 'Search for documents by name or content',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (filename pattern or content)',
              },
              search_type: {
                type: 'string',
                enum: ['filename', 'content'],
                description: 'Type of search to perform',
                default: 'filename',
              },
              path: {
                type: 'string',
                description: 'Subpath within Documents to search (optional)',
              },
              case_sensitive: {
                type: 'boolean',
                description: 'Case sensitive search',
                default: false,
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 50,
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_document_info',
          description: 'Get detailed information about a document',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the document within Documents folder',
              },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
        {
          name: 'check_documents_access',
          description: 'Verify access to the Documents folder and show configuration',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_documents':
            return await this.listDocuments(args);
          case 'read_document':
            return await this.readDocument(args);
          case 'search_documents':
            return await this.searchDocuments(args);
          case 'get_document_info':
            return await this.getDocumentInfo(args);
          case 'check_documents_access':
            return await this.checkDocumentsAccess(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async checkDocumentsAccess(args) {
    try {
      await fs.access(this.documentsPath);
      const stats = await fs.stat(this.documentsPath);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Documents folder access verified:\n\n` +
                  `📁 Path: ${this.documentsPath}\n` +
                  `🖥️  Platform: ${platform()}\n` +
                  `📊 Size: ${formatFileSize(stats.size)}\n` +
                  `📅 Modified: ${stats.mtime.toISOString()}\n` +
                  `🔒 Permissions: ${stats.mode.toString(8)}\n\n` +
                  `This server can only access files within the Documents folder for security.`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Cannot access Documents folder: ${error.message}`
      );
    }
  }

  async listDocuments(args) {
    const subPath = args.path || '';
    const includeHidden = args.include_hidden || false;
    const recursive = args.recursive || false;

    const targetPath = validateDocumentsPath(subPath);

    try {
      const items = await fs.readdir(targetPath, { withFileTypes: true });
      const results = [];

      for (const item of items) {
        // Skip hidden files unless requested
        if (!includeHidden && item.name.startsWith('.')) {
          continue;
        }

        const itemPath = join(targetPath, item.name);
        const relativePath = join(subPath, item.name);
        const metadata = await getFileMetadata(itemPath);

        if (metadata) {
          results.push({
            name: item.name,
            path: relativePath,
            type: item.isDirectory() ? 'directory' : 'file',
            size: metadata.size,
            sizeFormatted: metadata.sizeFormatted,
            modified: metadata.modified,
            extension: item.isDirectory() ? null : extname(item.name),
          });
        }
      }

      // Sort: directories first, then files alphabetically
      results.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        content: [
          {
            type: 'text',
            text: `📁 Documents${subPath ? `/${subPath}` : ''} contents:\n\n` +
                  results.map(item =>
                    `${item.type === 'directory' ? '📁' : '📄'} ${item.name}` +
                    `${item.type === 'file' ? ` (${item.sizeFormatted})` : ''}`
                  ).join('\n') +
                  `\n\nTotal: ${results.length} items`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list documents: ${error.message}`
      );
    }
  }

  async readDocument(args) {
    const filePath = validateDocumentsPath(args.path);
    const encoding = args.encoding || 'utf8';
    const maxLines = args.max_lines || 0;

    try {
      // Check if file exists and get metadata
      const metadata = await getFileMetadata(filePath);
      if (!metadata) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `File not found: ${args.path}`
        );
      }

      if (metadata.isDirectory) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Path is a directory, not a file: ${args.path}`
        );
      }

      // Check file size limit
      if (metadata.size > CONFIG.MAX_FILE_SIZE) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `File too large: ${metadata.sizeFormatted} (max: ${formatFileSize(CONFIG.MAX_FILE_SIZE)})`
        );
      }

      // Check file extension
      if (!isAllowedExtension(basename(filePath))) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `File type not allowed: ${extname(basename(filePath))}`
        );
      }

      // Read file content
      const content = await fs.readFile(filePath, encoding);

      // Apply line limit if specified
      let processedContent = content;
      let truncated = false;

      if (maxLines > 0) {
        const lines = content.split('\n');
        if (lines.length > maxLines) {
          processedContent = lines.slice(0, maxLines).join('\n');
          truncated = true;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `📄 ${args.path}\n` +
                  `📊 Size: ${metadata.sizeFormatted}\n` +
                  `📅 Modified: ${metadata.modified}\n` +
                  `🔤 Encoding: ${encoding}\n` +
                  `${truncated ? `⚠️  Truncated to ${maxLines} lines\n` : ''}\n` +
                  `--- Content ---\n\n${processedContent}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read document: ${error.message}`
      );
    }
  }

  async searchDocuments(args) {
    const query = args.query;
    const searchType = args.search_type || 'filename';
    const subPath = args.path || '';
    const caseSensitive = args.case_sensitive || false;
    const maxResults = args.max_results || 50;

    const targetPath = validateDocumentsPath(subPath);

    try {
      const results = [];
      const searchPattern = caseSensitive ? query : query.toLowerCase();

      // Recursive function to search directory
      async function searchDirectory(dirPath, relativePath = '') {
        if (results.length >= maxResults) return;

        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
          if (results.length >= maxResults) break;

          const itemPath = join(dirPath, item.name);
          const itemRelativePath = join(relativePath, item.name);

          if (item.isDirectory()) {
            // Recursively search subdirectories
            await searchDirectory(itemPath, itemRelativePath);
          } else {
            // Search based on type
            let match = false;
            let matchReason = '';

            if (searchType === 'filename') {
              const filename = caseSensitive ? item.name : item.name.toLowerCase();
              match = filename.includes(searchPattern);
              matchReason = 'filename';
            } else if (searchType === 'content') {
              try {
                const content = await fs.readFile(itemPath, 'utf8');
                const fileContent = caseSensitive ? content : content.toLowerCase();
                match = fileContent.includes(searchPattern);
                matchReason = 'content';
              } catch (error) {
                // Skip files that can't be read as text
                continue;
              }
            }

            if (match) {
              const metadata = await getFileMetadata(itemPath);
              results.push({
                path: itemRelativePath,
                name: item.name,
                matchType: matchReason,
                size: metadata?.size || 0,
                sizeFormatted: metadata?.sizeFormatted || 'unknown',
                modified: metadata?.modified || 'unknown',
              });
            }
          }
        }
      }

      await searchDirectory(targetPath, subPath);

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Search results for "${query}" (${searchType} search):\n\n` +
                  results.map(result =>
                    `📄 ${result.name}\n` +
                    `   Path: ${result.path}\n` +
                    `   Match: ${result.matchType}\n` +
                    `   Size: ${result.sizeFormatted}\n` +
                    `   Modified: ${result.modified}\n`
                  ).join('\n') +
                  `\n\nFound ${results.length} matches${results.length >= maxResults ? ' (limited)' : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Search failed: ${error.message}`
      );
    }
  }

  async getDocumentInfo(args) {
    const filePath = validateDocumentsPath(args.path);

    try {
      const metadata = await getFileMetadata(filePath);

      if (!metadata) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `File not found: ${args.path}`
        );
      }

      const filename = basename(filePath);
      const extension = extname(filename);

      return {
        content: [
          {
            type: 'text',
            text: `📄 Document Information: ${args.path}\n\n` +
                  `📁 Name: ${filename}\n` +
                  `🏷️  Extension: ${extension || 'none'}\n` +
                  `📊 Size: ${metadata.sizeFormatted} (${metadata.size} bytes)\n` +
                  `📅 Created: ${metadata.created}\n` +
                  `📅 Modified: ${metadata.modified}\n` +
                  `🔒 Permissions: ${metadata.permissions}\n` +
                  `📂 Type: ${metadata.isDirectory ? 'Directory' : 'File'}\n` +
                  `✅ Allowed: ${isAllowedExtension(filename) ? 'Yes' : 'No'}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get document info: ${error.message}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`📁 ${CONFIG.SERVER_NAME} running on stdio - Documents folder: ${this.documentsPath}`);
  }
}

const server = new DocumentsMCPServer();
server.run().catch(console.error);