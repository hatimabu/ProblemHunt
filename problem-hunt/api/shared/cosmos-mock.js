// Mock in-memory database for local development
const fs = require('fs');
const path = require('path');

// Path to store mock data
const DATA_FILE = path.join(__dirname, '..', '..', 'mock-db-data.json');

// Load data from file if exists
let persistedData = { problems: [], proposals: [], upvotes: [], tips: [] };
try {
  if (fs.existsSync(DATA_FILE)) {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    persistedData = JSON.parse(fileContent);
    console.log('📂 Loaded persisted data from mock database file');
  } else {
    console.log('🆕 Starting with empty database (no mock data)');
  }
} catch (error) {
  console.log('⚠️  Could not load persisted mock data:', error.message);
}

// Save data to file
function saveData() {
  try {
    const data = {
      problems: Array.from(problemsContainer.data.values()),
      proposals: Array.from(proposalsContainer.data.values()),
      upvotes: Array.from(upvotesContainer.data.values()),
      tips: Array.from(tipsContainer.data.values())
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('⚠️  Could not save mock data:', error.message);
  }
}

class MockContainer {
    constructor(name) {
      this.name = name;
      this.data = new Map();
    }
  
    items = {
      create: async (item) => {
        this.data.set(item.id, item);
        saveData(); // Persist to file
        return { resource: item };
      },
  
      query: (querySpec) => ({
        fetchAll: async () => {
          let results = Array.from(this.data.values());
          
          // Simple filtering
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
              if (param.name === '@authorId') {
                results = results.filter(r => r.authorId === param.value);
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
          saveData(); // Persist to file
          return { resource: item };
        },
        delete: async () => {
          this.data.delete(id);
          saveData(); // Persist to file
          return {};
        }
      };
    }
  }
  
  // Create containers
  const problemsContainer = new MockContainer('Problems');
  const proposalsContainer = new MockContainer('Proposals');
  const upvotesContainer = new MockContainer('Upvotes');
  const tipsContainer = new MockContainer('Tips');
  
  // Load persisted data (start with empty database if no persisted data exists)
  persistedData.problems.forEach(p => problemsContainer.data.set(p.id, p));
  persistedData.proposals.forEach(p => proposalsContainer.data.set(p.id, p));
  persistedData.upvotes.forEach(u => upvotesContainer.data.set(u.id, u));
  persistedData.tips.forEach(t => tipsContainer.data.set(t.id, t));
  
  const containers = {
    problems: problemsContainer,
    proposals: proposalsContainer,
    upvotes: upvotesContainer,
    tips: tipsContainer
  };
  
  module.exports = { containers };