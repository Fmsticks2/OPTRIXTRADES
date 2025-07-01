/**
 * Documentation Generator for OPTRIXTRADES
 * Automatically generates API documentation for bot commands and callbacks
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Command metadata storage
const commandRegistry = {};
const callbackRegistry = {};

/**
 * Register a command with its documentation
 * @param {string} command - The command name (without slash)
 * @param {Object} metadata - Command metadata
 * @param {string} metadata.description - Command description
 * @param {string} metadata.usage - Command usage example
 * @param {Array<Object>} metadata.params - Command parameters
 * @param {string} metadata.params[].name - Parameter name
 * @param {string} metadata.params[].description - Parameter description
 * @param {boolean} metadata.params[].required - Whether the parameter is required
 * @param {string} metadata.params[].type - Parameter type (string, number, etc.)
 * @param {string} metadata.category - Command category (user, admin, trading, etc.)
 * @param {string} metadata.permission - Required permission level (user, admin, etc.)
 * @param {Array<string>} metadata.examples - Example usages
 */
const registerCommand = (command, metadata) => {
  commandRegistry[command] = {
    command: `/${command}`,
    ...metadata,
    registered: new Date().toISOString()
  };
  
  logger.debug(`Registered command documentation: /${command}`);
};

/**
 * Register a callback query with its documentation
 * @param {string} callbackPattern - The callback data pattern
 * @param {Object} metadata - Callback metadata
 * @param {string} metadata.description - Callback description
 * @param {string} metadata.source - Source command or feature that generates this callback
 * @param {Array<Object>} metadata.params - Callback parameters
 * @param {string} metadata.params[].name - Parameter name
 * @param {string} metadata.params[].description - Parameter description
 * @param {string} metadata.params[].type - Parameter type (string, number, etc.)
 * @param {string} metadata.permission - Required permission level (user, admin, etc.)
 * @param {Array<string>} metadata.examples - Example callback data
 */
const registerCallback = (callbackPattern, metadata) => {
  callbackRegistry[callbackPattern] = {
    pattern: callbackPattern,
    ...metadata,
    registered: new Date().toISOString()
  };
  
  logger.debug(`Registered callback documentation: ${callbackPattern}`);
};

/**
 * Generate markdown documentation for all registered commands
 * @returns {string} - Markdown documentation
 */
const generateCommandDocs = () => {
  let markdown = '# Bot Commands Documentation\n\n';
  
  // Group commands by category
  const categories = {};
  
  for (const [command, metadata] of Object.entries(commandRegistry)) {
    const category = metadata.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(metadata);
  }
  
  // Generate documentation for each category
  for (const [category, commands] of Object.entries(categories)) {
    markdown += `## ${category}\n\n`;
    
    for (const metadata of commands) {
      markdown += `### ${metadata.command}\n\n`;
      markdown += `${metadata.description}\n\n`;
      
      if (metadata.permission) {
        markdown += `**Permission:** ${metadata.permission}\n\n`;
      }
      
      markdown += `**Usage:** ${metadata.usage}\n\n`;
      
      if (metadata.params && metadata.params.length > 0) {
        markdown += '**Parameters:**\n\n';
        markdown += '| Name | Description | Required | Type |\n';
        markdown += '|------|-------------|----------|------|\n';
        
        for (const param of metadata.params) {
          markdown += `| ${param.name} | ${param.description} | ${param.required ? 'Yes' : 'No'} | ${param.type} |\n`;
        }
        
        markdown += '\n';
      }
      
      if (metadata.examples && metadata.examples.length > 0) {
        markdown += '**Examples:**\n\n';
        
        for (const example of metadata.examples) {
          markdown += `\`${example}\`\n\n`;
        }
      }
    }
  }
  
  return markdown;
};

/**
 * Generate markdown documentation for all registered callbacks
 * @returns {string} - Markdown documentation
 */
const generateCallbackDocs = () => {
  let markdown = '# Callback Query Documentation\n\n';
  
  // Group callbacks by source
  const sources = {};
  
  for (const [pattern, metadata] of Object.entries(callbackRegistry)) {
    const source = metadata.source || 'Uncategorized';
    if (!sources[source]) {
      sources[source] = [];
    }
    sources[source].push(metadata);
  }
  
  // Generate documentation for each source
  for (const [source, callbacks] of Object.entries(sources)) {
    markdown += `## ${source}\n\n`;
    
    for (const metadata of callbacks) {
      markdown += `### ${metadata.pattern}\n\n`;
      markdown += `${metadata.description}\n\n`;
      
      if (metadata.permission) {
        markdown += `**Permission:** ${metadata.permission}\n\n`;
      }
      
      if (metadata.params && metadata.params.length > 0) {
        markdown += '**Parameters:**\n\n';
        markdown += '| Name | Description | Type |\n';
        markdown += '|------|-------------|------|\n';
        
        for (const param of metadata.params) {
          markdown += `| ${param.name} | ${param.description} | ${param.type} |\n`;
        }
        
        markdown += '\n';
      }
      
      if (metadata.examples && metadata.examples.length > 0) {
        markdown += '**Examples:**\n\n';
        
        for (const example of metadata.examples) {
          markdown += `\`${example}\`\n\n`;
        }
      }
    }
  }
  
  return markdown;
};

/**
 * Generate full API documentation
 * @param {string} outputDir - Directory to write documentation files
 * @returns {Promise<void>}
 */
const generateDocs = async (outputDir = 'docs/api') => {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate command documentation
    const commandDocs = generateCommandDocs();
    fs.writeFileSync(path.join(outputDir, 'commands.md'), commandDocs);
    
    // Generate callback documentation
    const callbackDocs = generateCallbackDocs();
    fs.writeFileSync(path.join(outputDir, 'callbacks.md'), callbackDocs);
    
    // Generate index file
    const indexContent = '# OPTRIXTRADES API Documentation\n\n' +
      '## Contents\n\n' +
      '- [Bot Commands](commands.md)\n' +
      '- [Callback Queries](callbacks.md)\n';
    
    fs.writeFileSync(path.join(outputDir, 'README.md'), indexContent);
    
    logger.info('Generated API documentation', { outputDir });
  } catch (error) {
    logger.error('Failed to generate API documentation', { error: error.message });
    throw error;
  }
};

/**
 * Scan controllers directory to auto-document commands
 * @param {string} controllersDir - Path to controllers directory
 * @returns {Promise<void>}
 */
const scanControllersForDocs = async (controllersDir = 'src/controllers') => {
  try {
    // Get all controller files
    const files = fs.readdirSync(controllersDir);
    
    for (const file of files) {
      if (file.endsWith('Controller.js')) {
        const controllerPath = path.join(controllersDir, file);
        const controllerContent = fs.readFileSync(controllerPath, 'utf8');
        
        // Extract JSDoc comments for command handlers
        const commandRegex = /\/\*\*[\s\S]*?\*\/[\s\S]*?(?:bot\.onText|bot\.command)\([\s\S]*?\)/g;
        const commandMatches = controllerContent.match(commandRegex) || [];
        
        for (const match of commandMatches) {
          // Extract command name
          const commandMatch = match.match(/(?:bot\.onText|bot\.command)\([\s\S]*?(\/[\w]+|"[\w]+"|'[\w]+')/i);
          if (commandMatch) {
            let command = commandMatch[1].replace(/[\/"']/g, '');
            
            // Extract JSDoc comment
            const jsDocMatch = match.match(/\/\*\*([\s\S]*?)\*\//i);
            if (jsDocMatch) {
              const jsDoc = jsDocMatch[1];
              
              // Parse JSDoc comment
              const description = (jsDoc.match(/@description\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              const usage = (jsDoc.match(/@usage\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              const category = (jsDoc.match(/@category\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              const permission = (jsDoc.match(/@permission\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              
              // Parse parameters
              const paramRegex = /@param\s+\{([^}]+)\}\s+([^\s]+)\s+(.+?)(?=@|\*\/)/g;
              const params = [];
              let paramMatch;
              
              while ((paramMatch = paramRegex.exec(jsDoc)) !== null) {
                const type = paramMatch[1];
                const name = paramMatch[2];
                const paramDescription = paramMatch[3].trim();
                const required = !paramDescription.includes('(optional)');
                
                params.push({
                  name,
                  description: paramDescription.replace('(optional)', '').trim(),
                  required,
                  type
                });
              }
              
              // Parse examples
              const exampleRegex = /@example\s+(.+?)(?=@example|@|\*\/)/gs;
              const examples = [];
              let exampleMatch;
              
              while ((exampleMatch = exampleRegex.exec(jsDoc)) !== null) {
                examples.push(exampleMatch[1].trim());
              }
              
              // Register command
              if (command && description) {
                registerCommand(command, {
                  description,
                  usage: usage || `/${command}`,
                  params,
                  category: category || 'General',
                  permission: permission || 'User',
                  examples
                });
              }
            }
          }
        }
        
        // Extract JSDoc comments for callback handlers
        const callbackRegex = /\/\*\*[\s\S]*?\*\/[\s\S]*?bot\.on\(['"](callback_query)['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?data\.match\(['"]([^'"]+)['"]\)/g;
        const callbackMatches = controllerContent.match(callbackRegex) || [];
        
        for (const match of callbackMatches) {
          // Extract callback pattern
          const patternMatch = match.match(/data\.match\(['"]([^'"]+)['"]\)/i);
          if (patternMatch) {
            const pattern = patternMatch[1];
            
            // Extract JSDoc comment
            const jsDocMatch = match.match(/\/\*\*([\s\S]*?)\*\//i);
            if (jsDocMatch) {
              const jsDoc = jsDocMatch[1];
              
              // Parse JSDoc comment
              const description = (jsDoc.match(/@description\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              const source = (jsDoc.match(/@source\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              const permission = (jsDoc.match(/@permission\s+(.+?)(?=@|\*\/)/s) || [])[1]?.trim();
              
              // Parse parameters
              const paramRegex = /@param\s+\{([^}]+)\}\s+([^\s]+)\s+(.+?)(?=@|\*\/)/g;
              const params = [];
              let paramMatch;
              
              while ((paramMatch = paramRegex.exec(jsDoc)) !== null) {
                const type = paramMatch[1];
                const name = paramMatch[2];
                const paramDescription = paramMatch[3].trim();
                
                params.push({
                  name,
                  description: paramDescription,
                  type
                });
              }
              
              // Parse examples
              const exampleRegex = /@example\s+(.+?)(?=@example|@|\*\/)/gs;
              const examples = [];
              let exampleMatch;
              
              while ((exampleMatch = exampleRegex.exec(jsDoc)) !== null) {
                examples.push(exampleMatch[1].trim());
              }
              
              // Register callback
              if (pattern && description) {
                registerCallback(pattern, {
                  description,
                  source: source || 'Unknown',
                  params,
                  permission: permission || 'User',
                  examples
                });
              }
            }
          }
        }
      }
    }
    
    logger.info('Scanned controllers for documentation', {
      commandsFound: Object.keys(commandRegistry).length,
      callbacksFound: Object.keys(callbackRegistry).length
    });
  } catch (error) {
    logger.error('Failed to scan controllers for documentation', { error: error.message });
  }
};

module.exports = {
  registerCommand,
  registerCallback,
  generateCommandDocs,
  generateCallbackDocs,
  generateDocs,
  scanControllersForDocs,
  commandRegistry,
  callbackRegistry
};