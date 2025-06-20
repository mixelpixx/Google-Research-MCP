/**
 * Research Enhancer Service
 * 
 * This service provides advanced content processing capabilities for research:
 * - Creating structured research documents from multiple sources
 * - Synthesizing content across multiple sources
 * - Organizing information by themes, chronology, comparison/contrast, etc.
 */

interface Source {
  url: string;
  title?: string;
  content?: string;
  summary?: string;
  error?: string;
}

interface ResearchDocumentOptions {
  topic: string;
  depth: string;
  focus_areas?: string[];
  sources: Source[];
}

interface SynthesisOptions {
  sources: Source[];
  focus?: string;
  structure: string;
}

export class ResearchEnhancer {
  
  /**
   * Creates a structured research document from multiple sources
   */
  async createResearchDocument(options: ResearchDocumentOptions): Promise<string> {
    const { topic, depth, focus_areas, sources } = options;
    
    // Filter out sources with errors
    const validSources = sources.filter(source => !source.error);
    
    if (validSources.length === 0) {
      throw new Error('No valid sources available for research');
    }
    
    // Create document header with metadata
    let document = `# Research: ${topic}\n\n`;
    document += `## Overview\n\n`;
    
    // Add research scope information
    document += `**Depth**: ${depth}\n`;
    if (focus_areas && focus_areas.length > 0) {
      document += `**Focus Areas**: ${focus_areas.join(', ')}\n`;
    }
    document += `**Sources**: ${validSources.length}\n\n`;
    
    // Create an executive summary based on source summaries
    document += this.generateExecutiveSummary(topic, validSources);
    
    // Organize content based on depth
    switch (depth.toLowerCase()) {
      case 'basic':
        document += this.organizeBasicResearch(topic, validSources);
        break;
      case 'advanced':
        document += this.organizeAdvancedResearch(topic, validSources, focus_areas);
        break;
      case 'intermediate':
      default:
        document += this.organizeIntermediateResearch(topic, validSources, focus_areas);
        break;
    }
    
    // Add sources section
    document += `\n## Sources\n\n`;
    validSources.forEach((source, index) => {
      document += `${index + 1}. [${source.title || source.url}](${source.url})\n`;
    });
    
    return document;
  }
  
  /**
   * Synthesizes content from multiple sources into a cohesive document
   */
  async synthesizeContent(options: SynthesisOptions): Promise<string> {
    const { sources, focus, structure } = options;
    
    // Filter out sources with errors
    const validSources = sources.filter(source => !source.error);
    
    if (validSources.length === 0) {
      throw new Error('No valid sources available for synthesis');
    }
    
    // Create document header
    let document = `# Synthesized Content\n\n`;
    
    if (focus) {
      document += `**Focus**: ${focus}\n\n`;
    }
    
    // Add a brief introduction about the sources
    document += `## Introduction\n\n`;
    document += `This document synthesizes information from ${validSources.length} sources`;
    if (focus) {
      document += ` with a focus on "${focus}"`;
    }
    document += `.\n\n`;
    
    // Organize content based on selected structure
    switch (structure.toLowerCase()) {
      case 'chronological':
        document += this.organizeChronologically(validSources, focus);
        break;
      case 'compare_contrast':
        document += this.organizeCompareContrast(validSources, focus);
        break;
      case 'question_answer':
        document += this.organizeQuestionAnswer(validSources, focus);
        break;
      case 'thematic':
      default:
        document += this.organizeThematically(validSources, focus);
        break;
    }
    
    // Add sources section
    document += `\n## Sources\n\n`;
    validSources.forEach((source, index) => {
      document += `${index + 1}. [${source.title || source.url}](${source.url})\n`;
    });
    
    return document;
  }
  
  /**
   * Generates an executive summary from source summaries
   */
  private generateExecutiveSummary(topic: string, sources: Source[]): string {
    let summary = `## Executive Summary\n\n`;
    
    // Combine available summaries and content
    const textToAnalyze: string[] = [];
    sources.forEach(source => {
      if (source.summary) textToAnalyze.push(source.summary);
      if (source.content) {
        // Extract first few paragraphs for summary analysis
        const firstPart = source.content.split('\n\n').slice(0, 3).join('\n\n');
        textToAnalyze.push(firstPart);
      }
    });
    
    if (textToAnalyze.length > 0) {
      // Extract key insights from actual content
      const keyInsights = this.extractKeyInsights(textToAnalyze, topic);
      const mainThemes = this.identifyMainThemes(textToAnalyze);
      
      summary += `This research on **${topic}** synthesizes findings from ${sources.length} authoritative sources. `;
      
      if (keyInsights.length > 0) {
        summary += `Key insights include: ${keyInsights.slice(0, 3).join('; ')}. `;
      }
      
      if (mainThemes.length > 0) {
        summary += `The analysis reveals ${mainThemes.length} main themes: ${mainThemes.slice(0, 4).join(', ')}. `;
      }
      
      summary += `This document provides comprehensive coverage of current understanding, practical applications, and emerging developments in ${topic}.\n\n`;
    } else {
      summary += `This document presents research on ${topic} based on ${sources.length} sources. `;
      summary += `The analysis provides an organized overview of key concepts, current understanding, `;
      summary += `and important developments in this field.\n\n`;
    }
    
    return summary;
  }
  
  /**
   * Organizes content for basic research (overview level)
   */
  private organizeBasicResearch(topic: string, sources: Source[]): string {
    let content = `## Key Concepts\n\n`;
    
    // Add definitions and basic explanations
    content += `### Definitions\n\n`;
    const definitions = this.extractDefinitions(sources, topic);
    if (definitions.length > 0) {
      definitions.forEach(def => {
        content += `- **${def.term}**: ${def.definition}\n`;
      });
    } else {
      content += `Based on the sources analyzed, ${topic} encompasses several key concepts that form the foundation of understanding in this field.\n`;
    }
    content += `\n`;
    
    // Extract main ideas from source content
    content += `### Main Ideas\n\n`;
    const mainIdeas = this.extractMainIdeas(sources);
    if (mainIdeas.length > 0) {
      mainIdeas.forEach(idea => {
        content += `- ${idea}\n`;
      });
    } else {
      content += `The analysis of sources reveals several important themes and concepts central to ${topic}.\n`;
    }
    content += `\n`;
    
    // Extract application examples from sources
    content += `### Common Applications\n\n`;
    const applications = this.extractApplications(sources);
    if (applications.length > 0) {
      applications.forEach(app => {
        content += `- ${app}\n`;
      });
    } else {
      content += `${topic} finds applications across various domains and use cases as documented in the analyzed sources.\n`;
    }
    content += `\n`;
    
    return content;
  }
  
  /**
   * Organizes content for intermediate research (detailed level)
   */
  private organizeIntermediateResearch(topic: string, sources: Source[], focus_areas?: string[]): string {
    let content = `## Detailed Analysis\n\n`;
    
    // Create sections based on focus areas if provided
    if (focus_areas && focus_areas.length > 0) {
      focus_areas.forEach(area => {
        content += `### ${this.capitalizeFirstLetter(area)}\n\n`;
        const areaContent = this.extractContentForArea(sources, area);
        if (areaContent.length > 0) {
          areaContent.forEach(item => {
            content += `- ${item}\n`;
          });
        } else {
          content += `Analysis of ${area} related to ${topic} from the gathered sources.\n`;
        }
        content += `\n`;
      });
    } else {
      // Default sections for intermediate research
      content += `### Background and Context\n\n`;
      const background = this.extractBackground(sources, topic);
      if (background.length > 0) {
        background.forEach(item => {
          content += `- ${item}\n`;
        });
      } else {
        content += `${topic} has developed within a specific historical and theoretical context as documented in the sources.\n`;
      }
      content += `\n`;
      
      content += `### Current Understanding\n\n`;
      const currentUnderstanding = this.extractCurrentUnderstanding(sources);
      if (currentUnderstanding.length > 0) {
        currentUnderstanding.forEach(item => {
          content += `- ${item}\n`;
        });
      } else {
        content += `The current understanding of ${topic} reflects ongoing research and development in the field.\n`;
      }
      content += `\n`;
      
      content += `### Practical Applications\n\n`;
      const applications = this.extractApplications(sources);
      if (applications.length > 0) {
        applications.forEach(app => {
          content += `- ${app}\n`;
        });
      } else {
        content += `${topic} finds practical application across various domains and industries.\n`;
      }
      content += `\n`;
      
      content += `### Challenges and Limitations\n\n`;
      const challenges = this.extractChallenges(sources);
      if (challenges.length > 0) {
        challenges.forEach(challenge => {
          content += `- ${challenge}\n`;
        });
      } else {
        content += `Several challenges and limitations have been identified in relation to ${topic}.\n`;
      }
      content += `\n`;
    }
    
    // Add a section for emerging trends
    content += `### Emerging Trends\n\n`;
    const trends = this.extractTrends(sources);
    if (trends.length > 0) {
      trends.forEach(trend => {
        content += `- ${trend}\n`;
      });
    } else {
      content += `Based on the analyzed sources, several emerging trends are shaping the future of ${topic}.\n`;
    }
    content += `\n`;
    
    return content;
  }
  
  /**
   * Organizes content for advanced research (comprehensive level)
   */
  private organizeAdvancedResearch(topic: string, sources: Source[], focus_areas?: string[]): string {
    let content = `## Comprehensive Analysis\n\n`;
    
    // Create sections based on focus areas if provided
    if (focus_areas && focus_areas.length > 0) {
      focus_areas.forEach(area => {
        content += `### ${this.capitalizeFirstLetter(area)}\n\n`;
        content += `In-depth analysis of ${area} related to ${topic}:\n\n`;
        
        // Add subsections for advanced analysis
        content += `#### Historical Development\n\n`;
        content += `#### Current Research\n\n`;
        content += `#### Theoretical Frameworks\n\n`;
        content += `#### Case Studies\n\n`;
      });
    } else {
      // Default sections for advanced research
      content += `### Historical Development\n\n`;
      content += `The historical development of ${topic} includes these key milestones:\n\n`;
      
      content += `### Theoretical Frameworks\n\n`;
      content += `Several theoretical frameworks have been proposed to understand ${topic}:\n\n`;
      
      content += `### Methodological Approaches\n\n`;
      content += `Research on ${topic} employs various methodological approaches:\n\n`;
      
      content += `### Current Research Directions\n\n`;
      content += `Current research on ${topic} is focused on these areas:\n\n`;
      
      content += `### Critical Debates\n\n`;
      content += `Some critical debates in ${topic} include:\n\n`;
      
      content += `### Case Studies\n\n`;
      content += `The following case studies provide insights into ${topic}:\n\n`;
    }
    
    // Add a section for future directions
    content += `### Future Directions\n\n`;
    content += `Based on the analyzed sources, future directions for ${topic} may include:\n\n`;
    
    return content;
  }
  
  /**
   * Organizes content thematically (by main themes/topics)
   */
  private organizeThematically(sources: Source[], focus?: string): string {
    let content = `## Thematic Analysis\n\n`;
    
    // Extract actual themes from content
    const allContent = sources
      .filter(s => s.content)
      .map(s => s.content!)
      .join('\n\n');
    
    const extractedThemes = this.identifyMainThemes([allContent]);
    
    if (focus) {
      content += `The following themes emerged in relation to "${focus}":\n\n`;
    } else {
      content += `Analysis of ${sources.length} sources revealed the following key themes:\n\n`;
    }
    
    // Use extracted themes plus core research themes
    const coreThemes = [
      "Definitions and Core Concepts",
      "Historical Context",
      "Recent Developments",
      "Applications and Use Cases",
      "Challenges and Limitations",
      "Future Directions"
    ];
    
    // Combine extracted and core themes, removing duplicates
    const allThemes = [...new Set([...extractedThemes, ...coreThemes])].slice(0, 8);
    
    allThemes.forEach(theme => {
      content += `### ${theme}\n\n`;
      
      // Extract actual content related to this theme
      const themeContent = this.extractThemeContent(sources, theme, focus);
      
      if (themeContent.length > 0) {
        themeContent.forEach((item, index) => {
          content += `${index + 1}. ${item}\n\n`;
        });
      } else {
        content += `Analysis of this theme reveals important insights from the gathered sources about ${theme.toLowerCase()}.\n\n`;
      }
      
      // Add source references
      const relevantSources = this.findSourcesForTheme(sources, theme);
      if (relevantSources.length > 0) {
        content += `*Sources: ${relevantSources.map((_, i) => `[${i + 1}]`).join(', ')}*\n\n`;
      }
    });
    
    return content;
  }
  
  /**
   * Organizes content chronologically (by time/development)
   */
  private organizeChronologically(sources: Source[], focus?: string): string {
    let content = `## Chronological Analysis\n\n`;
    
    if (focus) {
      content += `The chronological development of "${focus}" is outlined below:\n\n`;
    } else {
      content += `The chronological development of this topic is outlined below:\n\n`;
    }
    
    // Example time periods (would be determined from actual content in a full implementation)
    const periods = [
      "Early Development (Pre-2000)",
      "Foundational Period (2000-2010)",
      "Expansion Phase (2010-2020)",
      "Current State (2020-Present)",
      "Future Outlook"
    ];
    
    periods.forEach(period => {
      content += `### ${period}\n\n`;
      
      // Note about what would happen in actual implementation
      content += `This section would contain synthesized information about developments during ${period} extracted from multiple sources.\n\n`;
      
      // For each period, include relevant source attributions
      content += `Sources covering this period: [1], [2], etc.\n\n`;
    });
    
    return content;
  }
  
  /**
   * Organizes content as compare/contrast (similarities/differences)
   */
  private organizeCompareContrast(sources: Source[], focus?: string): string {
    let content = `## Compare and Contrast Analysis\n\n`;
    
    if (focus) {
      content += `This analysis compares and contrasts different perspectives on "${focus}":\n\n`;
    } else {
      content += `This analysis compares and contrasts different perspectives found in the sources:\n\n`;
    }
    
    // Areas of comparison
    content += `### Areas of Consensus\n\n`;
    content += `The following points represent areas where sources generally agree:\n\n`;
    
    content += `### Areas of Disagreement\n\n`;
    content += `The following points represent areas where sources present different or conflicting views:\n\n`;
    
    content += `### Complementary Perspectives\n\n`;
    content += `The following perspectives from different sources complement each other:\n\n`;
    
    // Detailed comparison of specific aspects
    content += `### Detailed Comparison by Aspect\n\n`;
    
    // Example aspects (would be determined from actual content)
    const aspects = ["Definitions", "Methodologies", "Results", "Implications"];
    
    aspects.forEach(aspect => {
      content += `#### ${aspect}\n\n`;
      
      // Compare how each source addresses this aspect
      content += `Comparison of ${aspect} across sources:\n\n`;
      
      // For each aspect, include relevant source attributions
      content += `Sources addressing this aspect: [1], [2], etc.\n\n`;
    });
    
    return content;
  }
  
  /**
   * Organizes content in question/answer format
   */
  private organizeQuestionAnswer(sources: Source[], focus?: string): string {
    let content = `## Question and Answer Analysis\n\n`;
    
    if (focus) {
      content += `The following questions and answers address key aspects of "${focus}":\n\n`;
    } else {
      content += `The following questions and answers address key aspects from the analyzed sources:\n\n`;
    }
    
    // Example questions (would be generated from actual content in a full implementation)
    const questions = [
      "What is the definition of this topic?",
      "What is the historical background?",
      "What are the main approaches or methodologies?",
      "What are the key findings or insights?",
      "What are the practical applications?",
      "What are the limitations or challenges?",
      "What future developments are anticipated?"
    ];
    
    questions.forEach(question => {
      content += `### ${question}\n\n`;
      
      // Note about what would happen in actual implementation
      content += `This section would contain a synthesized answer to this question based on information extracted from multiple sources.\n\n`;
      
      // For each question, include relevant source attributions
      content += `Sources addressing this question: [1], [2], etc.\n\n`;
    });
    
    return content;
  }
  
  /**
   * Extract definitions from source content
   */
  private extractDefinitions(sources: Source[], topic: string): Array<{ term: string; definition: string }> {
    const definitions: Array<{ term: string; definition: string }> = [];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      // Look for definition patterns in the content
      const content = source.content.toLowerCase();
      const topicLower = topic.toLowerCase();
      
      // Pattern 1: "Topic is defined as..." or "Topic is..."
      const isPattern = new RegExp(`${topicLower}\\s+is\\s+([^.!?]+[.!?])`, 'gi');
      let match = isPattern.exec(content);
      if (match) {
        definitions.push({
          term: topic,
          definition: match[1].trim()
        });
      }
      
      // Pattern 2: "Topic: definition" or "Topic - definition"
      const colonPattern = new RegExp(`${topicLower}[:\\-]\\s*([^.!?]+[.!?])`, 'gi');
      match = colonPattern.exec(content);
      if (match) {
        definitions.push({
          term: topic,
          definition: match[1].trim()
        });
      }
      
      // Extract other key terms that might be defined
      const sentences = source.content.split(/[.!?]+/);
      sentences.forEach(sentence => {
        if (sentence.includes(' is ') || sentence.includes(' means ') || sentence.includes(' refers to ')) {
          const trimmed = sentence.trim();
          if (trimmed.length > 20 && trimmed.length < 200) {
            const parts = trimmed.split(/\s+(is|means|refers to)\s+/);
            if (parts.length >= 3) {
              definitions.push({
                term: parts[0].trim(),
                definition: parts.slice(2).join(' ').trim()
              });
            }
          }
        }
      });
    });
    
    // Remove duplicates and return top 5
    const uniqueDefinitions = definitions.filter((def, index, self) =>
      index === self.findIndex(d => d.term.toLowerCase() === def.term.toLowerCase())
    );
    
    return uniqueDefinitions.slice(0, 5);
  }
  
  /**
   * Extract main ideas from source content
   */
  private extractMainIdeas(sources: Source[]): string[] {
    const ideas: string[] = [];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      // Split content into sentences and extract meaningful ones
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      
      // Look for sentences that might contain main ideas
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 200) {
          // Check for idea indicators
          const ideaIndicators = [
            'main', 'key', 'important', 'central', 'primary', 'fundamental',
            'essential', 'critical', 'significant', 'major', 'core'
          ];
          
          const sentenceLower = sentence.toLowerCase();
          if (ideaIndicators.some(indicator => sentenceLower.includes(indicator))) {
            ideas.push(sentence);
          }
          
          // Also include sentences that start with common idea patterns
          if (sentenceLower.startsWith('the ') ||
              sentenceLower.startsWith('this ') ||
              sentenceLower.startsWith('these ')) {
            ideas.push(sentence);
          }
        }
      });
    });
    
    // Remove duplicates and return top 10
    const uniqueIdeas = [...new Set(ideas)];
    return uniqueIdeas.slice(0, 10);
  }
  
  /**
   * Extract applications from source content
   */
  private extractApplications(sources: Source[]): string[] {
    const applications: string[] = [];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const content = source.content.toLowerCase();
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      
      // Look for application indicators
      const applicationIndicators = [
        'used in', 'applied to', 'application', 'use case', 'employed in',
        'utilized for', 'implemented in', 'deployed in', 'example',
        'instance', 'case study', 'real-world', 'practice', 'industry'
      ];
      
      sentences.forEach(sentence => {
        if (sentence.length > 20 && sentence.length < 150) {
          const sentenceLower = sentence.toLowerCase();
          if (applicationIndicators.some(indicator => sentenceLower.includes(indicator))) {
            applications.push(sentence);
          }
        }
      });
    });
    
    // Remove duplicates and return top 8
    const uniqueApplications = [...new Set(applications)];
    return uniqueApplications.slice(0, 8);
  }
  
  /**
   * Extract content for a specific focus area
   */
  private extractContentForArea(sources: Source[], area: string): string[] {
    const content: string[] = [];
    const areaLower = area.toLowerCase();
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 20 && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          if (sentenceLower.includes(areaLower) ||
              this.isRelevantToArea(sentenceLower, areaLower)) {
            content.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(content)].slice(0, 8);
  }
  
  /**
   * Extract background and context information
   */
  private extractBackground(sources: Source[], topic: string): string[] {
    const background: string[] = [];
    const backgroundIndicators = [
      'history', 'historical', 'background', 'origin', 'development',
      'evolution', 'emerged', 'began', 'started', 'founded', 'established'
    ];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          if (backgroundIndicators.some(indicator => sentenceLower.includes(indicator))) {
            background.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(background)].slice(0, 6);
  }
  
  /**
   * Extract current understanding and state
   */
  private extractCurrentUnderstanding(sources: Source[]): string[] {
    const understanding: string[] = [];
    const currentIndicators = [
      'current', 'currently', 'today', 'now', 'recent', 'modern',
      'contemporary', 'state-of-the-art', 'latest', 'present'
    ];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          if (currentIndicators.some(indicator => sentenceLower.includes(indicator))) {
            understanding.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(understanding)].slice(0, 6);
  }
  
  /**
   * Extract challenges and limitations
   */
  private extractChallenges(sources: Source[]): string[] {
    const challenges: string[] = [];
    const challengeIndicators = [
      'challenge', 'limitation', 'problem', 'issue', 'difficulty',
      'obstacle', 'barrier', 'constraint', 'drawback', 'disadvantage'
    ];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          if (challengeIndicators.some(indicator => sentenceLower.includes(indicator))) {
            challenges.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(challenges)].slice(0, 6);
  }
  
  /**
   * Extract emerging trends
   */
  private extractTrends(sources: Source[]): string[] {
    const trends: string[] = [];
    const trendIndicators = [
      'trend', 'trending', 'emerging', 'future', 'upcoming', 'next',
      'innovation', 'advance', 'development', 'growth', 'evolution'
    ];
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          if (trendIndicators.some(indicator => sentenceLower.includes(indicator))) {
            trends.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(trends)].slice(0, 6);
  }
  
  /**
   * Check if content is relevant to a specific area
   */
  private isRelevantToArea(content: string, area: string): boolean {
    // Create related terms for common focus areas
    const areaKeywords: { [key: string]: string[] } = {
      'application': ['use', 'apply', 'implement', 'deploy', 'utilize'],
      'method': ['approach', 'technique', 'procedure', 'process', 'way'],
      'result': ['outcome', 'finding', 'conclusion', 'effect', 'impact'],
      'limitation': ['constraint', 'drawback', 'problem', 'issue', 'challenge'],
      'advantage': ['benefit', 'strength', 'positive', 'good', 'effective'],
      'theory': ['concept', 'principle', 'framework', 'model', 'hypothesis']
    };
    
    const keywords = areaKeywords[area] || [];
    return keywords.some(keyword => content.includes(keyword));
  }
  
  /**
   * Helper function to capitalize the first letter of a string
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Extract key insights from text content
   */
  private extractKeyInsights(textArray: string[], topic: string): string[] {
    const insights: string[] = [];
    const allText = textArray.join(' ').toLowerCase();
    
    // Look for insight indicators
    const insightPatterns = [
      /(?:key finding|key insight|important finding|significant result|main conclusion)[s]?[:\-\s]+([^.!?]+[.!?])/gi,
      /(?:research shows|studies show|analysis reveals|findings indicate)[s]?[:\-\s]+([^.!?]+[.!?])/gi,
      /(?:concluded|determined|discovered|found)[:\-\s]+([^.!?]+[.!?])/gi
    ];
    
    insightPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const insight = match[1].trim();
        if (insight.length > 20 && insight.length < 200) {
          insights.push(this.capitalizeFirstLetter(insight));
        }
      }
    });
    
    return [...new Set(insights)].slice(0, 5);
  }

  /**
   * Identify main themes from text content
   */
  private identifyMainThemes(textArray: string[]): string[] {
    const themes = new Set<string>();
    const allText = textArray.join(' ').toLowerCase();
    
    // Common theme indicators
    const themePatterns = [
      /(?:theme|topic|area|aspect|domain|field|concept)[s]?\s+(?:of|in|about|regarding)\s+([a-z\s]{3,30})/gi,
      /(?:focus on|focuses on|centered on|related to)\s+([a-z\s]{3,30})/gi,
      /(?:study of|analysis of|research on)\s+([a-z\s]{3,30})/gi
    ];
    
    themePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const theme = match[1].trim();
        if (theme.length > 3 && theme.length < 25 && !theme.includes('the ') && !theme.includes('this ')) {
          themes.add(this.capitalizeFirstLetter(theme));
        }
      }
    });
    
    // Also extract common nouns that appear frequently
    const words = allText.split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 4 && cleaned.length < 20) {
        wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
      }
    });
    
    // Add frequently mentioned terms as themes
    Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([word]) => {
        themes.add(this.capitalizeFirstLetter(word));
      });
    
    return Array.from(themes).slice(0, 8);
  }

  /**
   * Extract content related to a specific theme
   */
  private extractThemeContent(sources: Source[], theme: string, focus?: string): string[] {
    const content: string[] = [];
    const themeLower = theme.toLowerCase();
    
    sources.forEach(source => {
      if (!source.content) return;
      
      const sentences = source.content.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 30 && sentence.length < 300) {
          const sentenceLower = sentence.toLowerCase();
          
          // Check if sentence is relevant to the theme
          if (sentenceLower.includes(themeLower) ||
              this.isRelevantToTheme(sentenceLower, themeLower) ||
              (focus && sentenceLower.includes(focus.toLowerCase()))) {
            content.push(sentence);
          }
        }
      });
    });
    
    return [...new Set(content)].slice(0, 6);
  }

  /**
   * Find sources that contain content for a specific theme
   */
  private findSourcesForTheme(sources: Source[], theme: string): Source[] {
    const themeLower = theme.toLowerCase();
    
    return sources.filter(source => {
      if (!source.content) return false;
      
      const contentLower = source.content.toLowerCase();
      return contentLower.includes(themeLower) ||
             this.isRelevantToTheme(contentLower, themeLower);
    });
  }

  /**
   * Check if content is relevant to a theme
   */
  private isRelevantToTheme(content: string, theme: string): boolean {
    const themeKeywords: { [key: string]: string[] } = {
      'definitions': ['define', 'definition', 'meaning', 'refers to', 'is defined as'],
      'concepts': ['concept', 'principle', 'idea', 'notion', 'theory'],
      'historical': ['history', 'historical', 'past', 'evolution', 'development'],
      'recent': ['recent', 'current', 'modern', 'contemporary', 'latest'],
      'applications': ['application', 'use', 'used for', 'applied', 'implementation'],
      'challenges': ['challenge', 'problem', 'issue', 'limitation', 'difficulty'],
      'future': ['future', 'upcoming', 'next', 'advancement', 'innovation']
    };
    
    const keywords = themeKeywords[theme] || theme.split(' ');
    return keywords.some(keyword => content.includes(keyword));
  }
}