/**
 * Enhanced tool definitions for improved MCP research experience
 * These tools would make working with the research server much more effective
 */

export const ENHANCED_RESEARCH_TOOLS = {
  // Tool for validating and testing the MCP server itself
  VALIDATE_MCP_SERVER: {
    name: 'validate_mcp_server',
    description: 'Validate the MCP server configuration, test API connectivity, and run health checks. Essential for deployment verification and troubleshooting.',
    inputSchema: {
      type: 'object',
      properties: {
        include_performance_test: {
          type: 'boolean',
          description: 'Run performance benchmarks including search speed and content extraction timing'
        },
        test_api_limits: {
          type: 'boolean', 
          description: 'Test rate limiting and API quota validation'
        },
        validate_cache: {
          type: 'boolean',
          description: 'Validate caching mechanism and performance'
        }
      }
    }
  },

  // Research workflow automation
  RESEARCH_WORKFLOW: {
    name: 'research_workflow',
    description: 'Execute a complete research workflow: search → extract → synthesize → export. Automates the most common research patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        research_question: {
          type: 'string',
          description: 'The main research question or topic to investigate'
        },
        search_strategies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Different search strategies to employ (e.g., "academic papers", "news articles", "official docs")'
        },
        max_sources: {
          type: 'number',
          description: 'Maximum number of sources to analyze (default: 10)'
        },
        output_format: {
          type: 'string',
          enum: ['research_report', 'executive_summary', 'fact_sheet', 'timeline'],
          description: 'Format for the final research output'
        },
        export_citations: {
          type: 'boolean',
          description: 'Include properly formatted citations (default: true)'
        }
      },
      required: ['research_question']
    }
  },

  // Source credibility analysis
  SOURCE_CREDIBILITY_ANALYSIS: {
    name: 'analyze_source_credibility',
    description: 'Analyze the credibility and reliability of web sources. Checks domain authority, publication date, author credentials, and cross-references claims.',
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'URLs to analyze for credibility'
        },
        criteria: {
          type: 'array',
          items: { 
            type: 'string',
            enum: ['domain_authority', 'author_expertise', 'publication_date', 'citation_quality', 'bias_detection']
          },
          description: 'Specific credibility criteria to evaluate'
        },
        include_recommendations: {
          type: 'boolean',
          description: 'Include recommendations for improving source selection'
        }
      },
      required: ['urls']
    }
  },

  // Fact-checking and verification
  FACT_CHECK_CLAIMS: {
    name: 'fact_check_claims',
    description: 'Extract claims from content and cross-reference them across multiple sources for verification. Essential for research quality assurance.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content containing claims to fact-check'
        },
        source_url: {
          type: 'string',
          description: 'Original source URL of the content'
        },
        claim_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['statistics', 'dates', 'quotes', 'causation', 'definitions']
          },
          description: 'Types of claims to focus on'
        },
        verification_sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Preferred domains for verification (e.g., gov, edu, established news)'
        }
      },
      required: ['content']
    }
  },

  // Research trend analysis
  RESEARCH_TREND_ANALYSIS: {
    name: 'analyze_research_trends',
    description: 'Analyze trends in research topics over time by searching for content across different date ranges and identifying patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Research topic to analyze trends for'
        },
        time_periods: {
          type: 'array',
          items: { type: 'string' },
          description: 'Time periods to analyze (e.g., ["2020-2021", "2022-2023", "2024"])'
        },
        trend_aspects: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['volume', 'sentiment', 'key_themes', 'geographic_distribution', 'source_types']
          },
          description: 'Aspects of trends to analyze'
        },
        include_predictions: {
          type: 'boolean',
          description: 'Include trend predictions based on analysis'
        }
      },
      required: ['topic']
    }
  },

  // Performance monitoring and optimization
  MCP_PERFORMANCE_MONITOR: {
    name: 'monitor_mcp_performance',
    description: 'Monitor and analyze MCP server performance, cache efficiency, and API usage patterns. Provides insights for optimization.',
    inputSchema: {
      type: 'object',
      properties: {
        monitoring_duration: {
          type: 'number',
          description: 'Duration to monitor in minutes (default: 10)'
        },
        include_cache_analysis: {
          type: 'boolean',
          description: 'Analyze cache hit rates and effectiveness'
        },
        include_api_usage: {
          type: 'boolean',
          description: 'Track API usage patterns and rate limiting'
        },
        export_metrics: {
          type: 'boolean',
          description: 'Export metrics in Prometheus format'
        }
      }
    }
  },

  // Research export and formatting
  EXPORT_RESEARCH: {
    name: 'export_research',
    description: 'Export research findings in various academic and professional formats with proper citations and formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        research_data: {
          type: 'string',
          description: 'Research content to export'
        },
        export_format: {
          type: 'string',
          enum: ['pdf', 'docx', 'latex', 'markdown', 'html', 'bibtex'],
          description: 'Export format'
        },
        citation_style: {
          type: 'string',
          enum: ['apa', 'mla', 'chicago', 'harvard', 'ieee'],
          description: 'Citation style to use'
        },
        include_appendices: {
          type: 'boolean',
          description: 'Include source URLs and extraction metadata'
        },
        template: {
          type: 'string',
          description: 'Template to use for formatting (optional)'
        }
      },
      required: ['research_data', 'export_format']
    }
  },

  // Batch research operations
  BATCH_RESEARCH_OPERATION: {
    name: 'batch_research_operation',
    description: 'Execute research operations on multiple topics simultaneously with progress tracking and result aggregation.',
    inputSchema: {
      type: 'object',
      properties: {
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of research topics to process'
        },
        operation_type: {
          type: 'string',
          enum: ['basic_research', 'comparative_analysis', 'trend_tracking', 'fact_checking'],
          description: 'Type of operation to perform on each topic'
        },
        parallel_processing: {
          type: 'boolean',
          description: 'Process topics in parallel (default: true)'
        },
        progress_callback: {
          type: 'boolean',
          description: 'Provide progress updates during processing'
        },
        aggregation_method: {
          type: 'string',
          enum: ['summary', 'comparison_table', 'individual_reports'],
          description: 'How to aggregate results'
        }
      },
      required: ['topics', 'operation_type']
    }
  }
};

// Research quality metrics that could be implemented
export const RESEARCH_QUALITY_METRICS = {
  source_diversity: 'Variety of source types and domains',
  temporal_coverage: 'Time span of sources analyzed', 
  geographic_coverage: 'Geographic diversity of sources',
  claim_verification_rate: 'Percentage of claims cross-verified',
  credibility_score: 'Average credibility score of sources',
  information_freshness: 'Recency of information gathered',
  synthesis_coherence: 'Quality of information synthesis',
  citation_completeness: 'Completeness of source citations'
};

// Suggested MCP server configuration improvements
export const MCP_SERVER_ENHANCEMENTS = {
  streaming_responses: 'Stream large research results to improve UX',
  progressive_loading: 'Load research results progressively',
  result_caching: 'Cache complex research workflows',
  offline_mode: 'Support offline analysis of cached content',
  collaborative_research: 'Share research sessions between users',
  research_templates: 'Pre-built templates for common research patterns',
  auto_fact_checking: 'Automatic fact-checking during synthesis',
  plagiarism_detection: 'Check for content originality',
  research_version_control: 'Track changes in research over time',
  intelligent_search_suggestions: 'AI-powered search query optimization'
};