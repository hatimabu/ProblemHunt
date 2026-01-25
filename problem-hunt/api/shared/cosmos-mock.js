// Mock in-memory database for local development
class MockContainer {
    constructor(name) {
      this.name = name;
      this.data = new Map();
    }
  
    items = {
      create: async (item) => {
        this.data.set(item.id, item);
        return { resource: item };
      },
  
      query: (querySpec) => ({
        fetchAll: async () => {
          let results = Array.from(this.data.values());
          
          // Simple filtering for category
          if (querySpec.parameters) {
            querySpec.parameters.forEach(param => {
              if (param.name === '@category') {
                results = results.filter(r => r.category === param.value);
              }
              if (param.name === '@budgetMin') {
                results = results.filter(r => r.budgetValue >= param.value);
              }
              if (param.name === '@budgetMax') {
                results = results.filter(r => r.budgetValue <= param.value);
              }
              if (param.name === '@problemId') {
                results = results.filter(r => r.problemId === param.value);
              }
              if (param.name === '@term') {
                const term = param.value.toLowerCase();
                results = results.filter(r => 
                  r.title?.toLowerCase().includes(term) || 
                  r.description?.toLowerCase().includes(term)
                );
              }
            });
          }
  
          // Simple sorting
          if (querySpec.query.includes('ORDER BY c.upvotes DESC')) {
            results.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
          } else if (querySpec.query.includes('ORDER BY c.createdAt DESC')) {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (querySpec.query.includes('ORDER BY c.budgetValue DESC')) {
            results.sort((a, b) => (b.budgetValue || 0) - (a.budgetValue || 0));
          }
  
          return { resources: results };
        }
      })
    };
  
    item(id, partitionKey) {
      return {
        read: async () => {
          const item = this.data.get(id);
          if (!item) throw { code: 404 };
          return { resource: item };
        },
        replace: async (item) => {
          this.data.set(id, item);
          return { resource: item };
        },
        delete: async () => {
          this.data.delete(id);
          return {};
        }
      };
    }
  }
  
  // Pre-populate with dummy data
  const problemsContainer = new MockContainer('Problems');
  const proposalsContainer = new MockContainer('Proposals');
  const upvotesContainer = new MockContainer('Upvotes');
  
  // Add initial dummy problems
  const dummyProblems = [
    {
      id: '1',
      title: 'I need a way to automatically transcribe and summarize my Zoom calls',
      description: 'After every meeting, I spend 30 minutes writing notes. I want a tool that records, transcribes, and gives me a 3-bullet summary of action items.',
      category: 'Productivity',
      budget: '$50/month',
      budgetValue: 50,
      upvotes: 342,
      proposals: 8,
      author: 'David Chen',
      authorId: 'user1',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      title: 'A tool that tracks when my favorite creators post new content across all platforms',
      description: 'I follow creators on YouTube, Twitter, Substack, and TikTok. I want one place to see when they post anything new.',
      category: 'Social',
      budget: '$15/month',
      budgetValue: 15,
      upvotes: 289,
      proposals: 12,
      author: 'Emma Wilson',
      authorId: 'user2',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      title: 'An app that reminds me to follow up with people I met at conferences',
      description: 'I collect business cards and LinkedIn connections but never follow up. Need smart reminders based on context and my calendar.',
      category: 'Productivity',
      budget: '$20/month',
      budgetValue: 20,
      upvotes: 256,
      proposals: 6,
      author: 'Jason Park',
      authorId: 'user3',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      title: 'A browser extension that blocks LinkedIn recruiters unless they mention salary',
      description: 'Tired of "exciting opportunity" messages that waste my time. Only show me messages that include actual compensation info.',
      category: 'Productivity',
      budget: '$10/month',
      budgetValue: 10,
      upvotes: 518,
      proposals: 15,
      author: 'Rachel Torres',
      authorId: 'user4',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      title: 'Software that automatically categorizes and files my business receipts',
      description: 'I take photos of receipts but never organize them. Need OCR + smart categorization for tax time.',
      category: 'Finance',
      budget: '$30/month',
      budgetValue: 30,
      upvotes: 198,
      proposals: 9,
      author: 'Marcus Johnson',
      authorId: 'user5',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '6',
      title: 'A service that negotiates my bills for me automatically',
      description: 'Cable, phone, insurance - I know I\'m overpaying but hate calling. Want AI to negotiate better rates on my behalf.',
      category: 'Finance',
      budget: '$25/month',
      budgetValue: 25,
      upvotes: 445,
      proposals: 11,
      author: 'Lisa Anderson',
      authorId: 'user6',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '7',
      title: 'An AI that writes personalized thank-you notes based on gift descriptions',
      description: 'I\'m terrible at thank-you notes. Tell it what gift I got from whom, and it writes a genuine-sounding note.',
      category: 'Social',
      budget: '$5/use',
      budgetValue: 5,
      upvotes: 167,
      proposals: 4,
      author: 'Kevin Martinez',
      authorId: 'user7',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '8',
      title: 'A tool that finds the cheapest combination of streaming services for shows I want to watch',
      description: 'I want to watch 20 specific shows. Tell me the cheapest combo of Netflix/Hulu/etc to get them all, and when to rotate subscriptions.',
      category: 'Entertainment',
      budget: '$10/month',
      budgetValue: 10,
      upvotes: 623,
      proposals: 18,
      author: 'Amy Zhang',
      authorId: 'user8',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  dummyProblems.forEach(p => problemsContainer.data.set(p.id, p));
  
  const containers = {
    problems: problemsContainer,
    proposals: proposalsContainer,
    upvotes: upvotesContainer,
    tips: new MockContainer('Tips')
  };
  
  module.exports = { containers };