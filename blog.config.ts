import type { BlogConfig } from './template/blog.config.ts';

const config: BlogConfig = {
  name: "n8nKnowledge.com",
  homeTitle: "n8n Tutorials, Workflow Templates & Automation Guides | n8nKnowledge.com",
  description: "n8n tutorials, workflows, templates, and automation guides",
  site: "https://n8nknowledge.com",
  language: "en",
  niche: "n8n tutorials, workflows, templates",
  colors: { primary: "#ff6d5a", accent: "#1a1a2e" },
  analytics: { plausibleDomain: "n8nknowledge.com" },
  author: {
    type: 'Person',
    name: 'Sergii Muliarchuk',
    url: '/author',
    bio: 'Sergii Muliarchuk is the founder of FlipFactory, an AI automation agency building production AI systems — MCP servers, n8n workflows, and voice agents — for fintech, e-commerce, and SaaS clients.',
    sameAs: [
      'https://www.linkedin.com/in/sergii-muliarchuk/',
      'https://github.com/MuliarchukSV',
    ],
  },
};

export default config;
