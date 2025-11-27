# LeadFlow - Lead Enrichment Platform

A modern, production-ready lead enrichment application built with React, TypeScript, and Lovable Cloud (Supabase).

![LeadFlow Logo](src/assets/logo.png)

## 🎯 Features

- **Lead Management**: Upload leads via CSV or manual entry with full field support
- **Automated Enrichment**: Intelligent company domain discovery using multiple strategies
- **User Authentication**: Secure email/password authentication with auto-confirmation
- **Real-time Updates**: Live dashboard with instant enrichment results
- **Data Security**: Row-level security policies ensuring user data privacy
- **Modern UI**: Clean, minimalist design with lavender accents

## 📋 Lead Fields Supported

- Full Name
- Phone Number
- Email Address
- Company
- City
- State
- DMA (Designated Market Area)
- Zipcode

## 🔄 Enrichment Process

The platform uses a multi-strategy approach to find company domains:

1. **Email Extraction** (95% confidence): Extracts domain from email addresses (excluding generic providers)
2. **Pattern Matching** (75% confidence): Tests common TLDs (.com, .io, .net, .co)
3. **Alternative Patterns** (60% confidence): Tries company name variations with hyphens and spaces

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Lovable Cloud account (automatically provisioned)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### First-Time Setup

1. Navigate to `http://localhost:8080/auth`
2. Create an account with your email and password
3. Start adding and enriching leads!

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn/ui with custom variants
- **State Management**: React hooks with Supabase real-time
- **Routing**: React Router v6

### Backend (Lovable Cloud)
- **Database**: PostgreSQL with row-level security
- **Authentication**: Email/password with auto-confirmation
- **Functions**: Serverless edge function for enrichment
- **Security**: RLS policies per user

### Database Schema

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  city TEXT,
  state TEXT,
  dma TEXT,
  zipcode TEXT,
  domain TEXT,
  enrichment_status TEXT DEFAULT 'pending',
  enrichment_source TEXT,
  enrichment_confidence NUMERIC,
  enriched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);
```

## 🎨 Design System

### Brand Colors
- **Primary**: `#000000` (Black) - Main brand color for text and primary elements
- **Accent**: `#DCA7F7` (Lavender) - Highlight color for interactive elements
- **Background**: `#FAFAFA` (Off-white) - Clean, minimal background

### Typography
- **Font**: System font stack with Inter fallback
- **Weights**: Medium (500) for headings, Regular (400) for body text

### Design Philosophy
Modern minimalist aesthetic with geometric elements representing data connection and flow. Clean lines, generous whitespace, and purposeful use of accent colors create a professional, tech-forward appearance.

## 🔧 Configuration

### Environment Variables

The following variables are automatically configured by Lovable Cloud:

- `VITE_SUPABASE_URL` - Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

### Authentication Settings

Email confirmation is automatically enabled for instant testing. Modify in Cloud settings if needed.

## 📊 Usage

### Adding Leads

**Manual Entry:**
1. Click "Manual Entry" tab
2. Fill in lead information (Name is required)
3. Click "Add Lead"

**CSV Upload:**
1. Click "CSV Upload" tab
2. Select a CSV file with headers matching lead fields
3. File uploads automatically

### Enriching Leads

1. Find the lead in the table
2. Click the "Enrich" button
3. Watch as the domain is discovered and confidence score displayed
4. Click on any row to view full enrichment details

### Managing Leads

- **View Details**: Click any row to see complete lead information
- **Delete**: Click the trash icon to remove a lead
- **Sort**: Click column headers to sort (future enhancement)

## 🔐 Security

- **Row-Level Security**: Each user can only access their own leads
- **Authentication**: Secure password-based authentication
- **Input Validation**: All inputs validated on client and server
- **CORS**: Properly configured for edge functions

## 📦 Deployment

### Via Lovable

1. Click "Publish" in the top right
2. Your app is live instantly!

### Custom Domain

1. Go to Project Settings → Domains
2. Follow instructions to connect your domain

## 🛠️ Development

### Project Structure

```
src/
├── assets/          # Images and static files
├── components/      # React components
│   ├── ui/         # Shadcn UI components
│   ├── LeadUpload.tsx
│   └── LeadsTable.tsx
├── pages/          # Route pages
│   ├── Index.tsx
│   ├── Auth.tsx
│   └── NotFound.tsx
├── integrations/   # Supabase client (auto-generated)
└── hooks/          # Custom React hooks

supabase/
└── functions/      # Edge functions
    └── enrich-lead/
```

### Adding New Enrichment Sources

To add additional enrichment APIs:

1. Update `supabase/functions/enrich-lead/index.ts`
2. Add new strategy in `findCompanyDomain()` function
3. Update confidence scores accordingly
4. Deploy (automatic on next build)

Example:

```typescript
// Add after existing strategies
try {
  const response = await fetch(`https://api.example.com/enrich?company=${company}`);
  const data = await response.json();
  if (data.domain) {
    return {
      domain: data.domain,
      source: "api_provider",
      confidence: 90,
    };
  }
} catch (error) {
  console.log("API enrichment failed");
}
```

## 📈 Future Enhancements

- [ ] Additional enrichment fields (LinkedIn, industry, size)
- [ ] Bulk enrichment for multiple leads
- [ ] Export enriched data to CSV
- [ ] Integration with CRM systems
- [ ] Advanced filtering and search
- [ ] Analytics dashboard
- [ ] API key management for external enrichment services

## 🤝 Contributing

This is a Lovable-generated project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for commercial or personal purposes.

## 🆘 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Discord Community](https://discord.gg/lovable)
- [GitHub Issues](YOUR_REPO_URL/issues)

## 🙏 Credits

Built with [Lovable](https://lovable.dev) - The AI-powered app builder.

---

**Made with ❤️ using Lovable Cloud**
