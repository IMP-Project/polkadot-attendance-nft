# Polkadot Attendance NFT - Node.js Migration Plan

## 🎯 Project Overview

This document outlines the complete migration from Go backend to Node.js for the Polkadot Attendance NFT system, focusing on seamless Luma integration with automated event sync and NFT minting.

## 🚀 MVP Definition

### Core MVP Flow
1. **Event Creation**: Events are created on Luma platform
2. **Auto-Sync**: Events automatically sync to our dapp via polling
3. **Attendee Registration**: Users register on Luma with Polkadot wallet address
4. **Check-in Process**: Attendees check in on Luma during event
5. **Auto-Mint NFT**: System detects check-in and generates NFT automatically
6. **On-Chain Verification**: NFT can be confirmed and viewed on blockchain

### MVP Success Criteria
- ✅ **Luma to Dapp Sync**: Events appear in dapp within 10 seconds of Luma creation
- ✅ **Automatic NFT Minting**: NFT generated within 5-10 seconds of check-in
- ✅ **Blockchain Verification**: "View on Chain" button shows NFT on Polkadot explorer
- ✅ **Zero Manual Intervention**: Complete automation from check-in to NFT delivery
- ✅ **Error Resilience**: System handles invalid addresses and API failures gracefully

### MVP Scope Exclusions
- **Custom Design Upload**: Use default template only
- **Advanced Admin Features**: Basic event list view only  
- **Complex User Management**: Wallet authentication only
- **Detailed Analytics**: Basic check-in counts only
- **Multi-Event Features**: Focus on single event workflow

### MVP Components Required
1. **Simplified Smart Contract**: NFT-only minting functionality
2. **Node.js Backend**: Luma polling + auto-minting service
3. **Frontend Updates**: Settings page for Luma integration + event list
4. **Local Development**: Docker Compose setup for testing

This MVP validates the core automated workflow before adding advanced features.

## ✅ Phase 1-2 Completed

### ✅ Phase 1: Project Cleanup & Foundation (COMPLETED)
- **✅ Go Backend Archived**: Moved to `backend-go-archive/`
- **✅ Node.js Structure Created**: Complete backend-nodejs/ directory setup
- **✅ Docker Compose Setup**: Local development environment with PostgreSQL
- **✅ Package Dependencies**: All Node.js packages configured
- **✅ Environment Configuration**: Updated .env.example with Aleph Zero testnet

### ✅ Phase 2: Smart Contract Simplification (COMPLETED)
- **✅ Removed Event Management**: Eliminated dual event storage complexity
- **✅ Luma String ID Support**: Contract now uses Luma event IDs directly
- **✅ Owner-Only Minting**: Simplified authorization model
- **✅ New ABI Generated**: Updated contract interface for Node.js integration
- **✅ Aleph Zero Deployment**: Contract deployed to testnet at `5HcpLmXpWtP7jJ9mmLvubJTzg2a1JM4EPM5Em6ZDb6U6ADGw`
- **✅ Multi-User Architecture**: Designed for per-user Luma API key storage

### Current Smart Contract Interface
```rust
// Simplified NFT-only contract
mint_nft(luma_event_id: String, recipient: AccountId, metadata: String) -> bool
get_nft(nft_id: u64) -> Option<AttendanceNft>
get_owned_nfts(owner: AccountId) -> Vec<u64>
get_nft_count() -> u64
get_owner() -> AccountId
transfer_ownership(new_owner: AccountId) -> bool
```

## 🔍 Current State Analysis

### Frontend Architecture (Ready for Integration)
- **Framework**: React 18 + Material-UI with Polkadot themes
- **Wallet Integration**: Polkadot.js extension for wallet connections
- **Authentication**: Wallet address-based login (no passwords required)
- **API Layer**: Comprehensive service with retry logic and JWT handling
- **Key Features**: Admin dashboard, events management, NFT gallery, design upload

### Backend Migration Goals (Phase 3+ Remaining)
- **Simplify**: Reduce from 3,000+ lines of Go to ~500 lines of Node.js
- **Automate**: Real-time Luma integration via polling
- **Maintain**: Zero frontend changes required
- **Enhance**: Better performance and maintainability

## 🏗️ Node.js Backend Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Polkadot wallet signatures
- **File Upload**: Multer + Cloudinary
- **Blockchain**: @polkadot/api
- **Containerization**: Docker + Docker Compose
- **Rate Limiting**: express-rate-limit
- **Real-time**: Socket.io for live updates
- **Polling**: Custom polling service for Luma API

### Directory Structure
```
backend-nodejs/
├── src/
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── models/            # Database schemas
│   ├── middleware/        # Auth, validation, etc.
│   ├── utils/             # Helpers
│   └── app.js            # Express app setup
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── docker-compose.yml    # Local development setup
├── Dockerfile           # Container configuration
├── package.json
└── .env.example
```

## 🔐 Authentication Flow

### Polkadot Wallet-Based Login
**No passwords, no email registration - just wallet address authentication.**

**Flow**: User connects wallet → Frontend gets wallet address → POST /api/login → Backend validates address → Generate JWT → Return token + user data → Frontend stores token → Authenticated requests include Bearer token

## 🔗 API Endpoints Mapping

### Core Endpoints (11 Essential APIs)

**Authentication:**
- POST /api/login - Wallet login → JWT

**Events:**
- GET /api/user/events - List user events (Luma synced)
- GET /api/admin/events/:id - Get single event details

**NFTs:**
- GET /api/admin/nfts - List all NFTs
- GET /api/user/events/:id/nfts - NFTs for specific event

**Check-ins:**
- GET /api/user/events/:id/check-ins/count - Check-in count for event
- GET /api/user/events/check-ins/counts - All events check-in counts
- GET /api/user/events/:id/check-ins - Full check-in details

**Designs:**
- POST /api/user/designs/upload - Upload design image
- POST /api/user/apply-design/:eventId/:designId - Apply design to event

**Luma Integration:**
- POST /api/user/luma-api-key - Save Luma API key
- GET /api/user/luma-api-key - Retrieve saved API key
- DELETE /api/user/luma-api-key - Disconnect Luma integration
- POST /api/sync/start - Start real-time polling
- POST /api/sync/stop - Stop polling

**Real-Time Updates:**
- WebSocket /socket.io - Real-time event/NFT updates
- GET /api/sync/status - Check polling status

**Health:**
- GET /api/health - Backend status check

## 🔄 Luma Integration Workflow

### Settings-Based Luma Integration (REQUIRED APPROACH)

**No Manual Event Creation** - All events must come from Luma integration via Settings page.

**Flow**: User goes to Settings → Luma Integration Section → Enter Luma API Key → Test API key validity → Save to user profile → Enable auto-sync polling → Events sync every 10 seconds → Check-ins sync every 5 seconds

### Events Page Changes
- Remove "Create Event" button completely
- Show message to connect Luma if not integrated
- Display only synced events from Luma account
- All events are read-only (managed in Luma)

## ⚠️ CRITICAL: Luma Webhook Limitation

**Luma does NOT provide webhooks** - we need alternative real-time sync strategies.

### Real-Time Polling Strategy

**Backend Polling Service:**
- Event polling every 10 seconds  
- Check-in polling every 5 seconds
- Per-user polling management
- Automatic NFT minting when check-ins detected
- Rate limiting to respect Luma API limits

**WebSocket Real-Time Updates:**
- Socket.io integration for instant frontend updates
- User-specific event channels
- Real-time notifications for new events and minted NFTs
- Authenticated socket connections with JWT

**Frontend Integration:**
- Socket.io client for real-time updates
- Toast notifications for new events/NFTs
- Automatic UI updates without page refresh
- Connection management and reconnection logic

## 🐳 Local Development Setup

### Docker Compose Configuration
**Services:**
- PostgreSQL database
- Node.js backend with hot reload
- React frontend with development server
- All services networked together

### Quick Start Commands
- `docker-compose up -d` - Start all services
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: localhost:5432

### Environment Configuration
**Required Environment Variables:**
- Database connection string
- JWT secret key
- Cloudinary credentials
- Polkadot RPC URL and contract details
- Development/production mode settings

## 🔗 Smart Contract Changes

### Current Contract Issues

**Problem 1: Event ID Mismatch**
- Current: Contract creates sequential IDs (1, 2, 3...)
- Luma: Uses string IDs like "evt-abc123xyz" 
- Conflict: Can't link Luma events to on-chain events

**Problem 2: Authorization Model**
- Current: Only event organizer or contract owner can mint NFTs
- New Approach: Backend service needs to auto-mint when check-ins happen
- Issue: Backend won't be the "organizer" of Luma events

**Problem 3: Event Dependency**
- Current: mint_nft requires event to exist on-chain first
- New Approach: Events only exist in Luma, not on-chain
- Problem: Can't mint NFTs without creating events on-chain

### Recommended Solution: Simplified NFT-Only Contract

**Remove Completely:**
- `create_event()` function
- Event storage mapping  
- Event-related queries
- Event authorization checks

**Keep Only:**
- `mint_nft()` - simplified version
- `get_nft()` - NFT queries
- `get_owned_nfts()` - user's NFTs  
- `get_nft_count()` - total count

### Updated Contract Structure

**Simplified NFT Model:**
```rust
pub struct Nft {
    id: u64,
    owner: AccountId,
    metadata: String,  // Contains all event details from Luma
}
```

**Simplified Authorization:**
- Only contract owner (backend service) can mint NFTs
- No event organizer checks needed
- Direct minting without event dependency

**Rich Metadata Approach:**
Instead of storing events on-chain, embed all event information in NFT metadata:
```json
{
  "name": "DevCon Bangkok Attendance",
  "description": "Proof of attendance for DevCon Bangkok", 
  "image": "https://cloudinary.com/design123.png",
  "luma_event_id": "evt-abc123xyz",
  "event_name": "DevCon Bangkok",
  "event_date": "2024-11-11",
  "event_location": "Bangkok, Thailand",
  "checked_in_at": "2024-11-11T10:30:00Z",
  "attendee_name": "John Doe"
}
```

### Contract Migration Benefits

**Alignment with Luma-First Approach:**
- Single source of truth: Luma manages all event logic
- On-chain storage: Only for NFT ownership and verification
- Clean separation: Event management vs NFT minting

**Technical Advantages:**
- 60-70% reduction in contract complexity
- Better gas efficiency (no event storage)
- More flexible for future platform integrations
- Simpler authorization model

**Functional Benefits:**
- "View on Chain" verification still works perfectly
- All event details preserved in NFT metadata
- Easier debugging and maintenance
- Future-proof architecture

## 🎨 NFT Design Assignment Strategy

### AI Auto-Categorization System

**Event Categorization Logic:**
- Analyze Luma event title and description using keyword matching
- Categories: Tech/Developer, Business/Corporate, Social/Community, Art/Creative
- Default fallback to general template if no clear category match

**Implementation Approach:**
```
Event Keywords → Category Detection → Auto-Assign Design Template
```

**Keyword Categories:**
- **Tech**: blockchain, polkadot, developer, coding, hackathon, web3, defi
- **Business**: conference, summit, networking, corporate, enterprise
- **Social**: meetup, community, social, gathering, party
- **Art**: art, creative, design, exhibition, gallery

**Design Template Requirements:**
- 4 default templates (one per category)
- Cloudinary storage for template images
- Easy template replacement/updating
- Preview functionality for organizers

## ⚠️ Error Handling & Recovery Strategy

### Invalid Polkadot Address Handling

**Validation Process:**
1. **Format Validation**: SS58 format, 32-byte length, network prefix check
2. **Skip & Log**: Don't mint for invalid addresses, preserve attendee record
3. **Notification System**: Alert event organizers about failed mints
4. **Manual Recovery Dashboard**: Show failed mints for manual processing

**Validation Flow:**
```
Check-in Detected → Extract Address → Validate Format → 
Valid: Proceed to Mint → Invalid: Log + Skip + Notify Organizer
```

**No Alternative Minting**: Do not mint to organizer wallet for invalid addresses

### Luma API Failure Handling

**Service Degradation Strategy:**
- **Queue System**: Store failed API calls for retry when service returns
- **Graceful Degradation**: Show cached event data during outages
- **Status Monitoring**: Real-time Luma API health dashboard
- **Recovery Polling**: Increased polling frequency when service recovers
- **Retry Logic**: Exponential backoff for failed requests

### Blockchain Minting Failures

**Resilience Strategy:**
- **Transaction Retry**: 3 attempts with exponential backoff
- **Gas Fee Monitoring**: Pause minting if gas costs too high
- **Queue Management**: Failed mints queued for automatic retry
- **Manual Override**: Admin dashboard for manual retry of failed mints
- **Transaction Monitoring**: Track pending/failed transactions

### Error Logging & Monitoring

**Comprehensive Logging:**
- Failed address validations with attendee details
- API failures with retry attempts
- Blockchain transaction failures with gas info
- System health metrics and uptime

## 🚀 Contract Deployment Requirements

### Technical Deployment Process

**Required Components:**
- **Polkadot Account**: Funded with DOT for deployment gas fees
- **Contract WASM**: Compiled bytecode from Rust source
- **Contract ABI**: JSON interface for frontend/backend integration
- **RPC Endpoint**: Polkadot node connection (mainnet/testnet)
- **Deployment Keys**: Private key for contract ownership

**Deployment Steps:**
1. **Compile Contract**: Generate WASM and ABI files
2. **Testnet Deployment**: Deploy and test all functions
3. **Integration Testing**: Verify Node.js backend connectivity
4. **Mainnet Deployment**: Production contract deployment
5. **Configuration Update**: Update contract address in all services

**Post-Deployment Configuration:**
- Update frontend contract address
- Update backend contract address
- Configure minting keypair for backend service
- Verify contract ownership and permissions

### Migration Timeline

**Week 1: Contract Development**
- Design simplified contract structure
- Implement NFT-only functionality with AI design integration
- Add comprehensive testing and error handling
- Setup design categorization system

**Week 2: Testing & Deployment**
- Deploy to testnet with full error handling
- Test Node.js backend integration
- Verify design assignment automation
- Test all failure scenarios and recovery

**Week 3: Production Migration**
- Deploy to mainnet
- Update backend to use new contract
- Implement monitoring and alerting
- Go live with automated system

## 📊 Database Schema

### Core Models
**User Model:**
- Wallet address (unique identifier)
- Luma API key (encrypted)
- Luma account ID for linking
- Timestamps

**Event Model:**
- Luma event ID (unique)
- Event details (name, date, location)
- Auto-sync status
- User relationship

**NFT Model:**
- Event and owner relationships
- Blockchain transaction hash
- Metadata with design information
- Confirmation status

**Design Model:**
- Event-specific designs
- Cloudinary image references
- Active status per event
- User ownership

## 🚀 Migration Timeline

### Week 1: Foundation Setup
- Create Node.js project structure
- Set up Docker Compose for local development
- Configure PostgreSQL with Prisma
- Implement basic Express app with middleware
- Create authentication endpoints (wallet login)
- Set up health check endpoint

### Week 2: Core API Implementation
- Implement event management endpoints
- Add NFT querying and metadata handling
- Create design upload functionality
- Set up Polkadot.js integration for minting
- Add check-in counting logic
- Test all endpoints with existing frontend

### Week 3: Luma Integration & Real-Time Features
- Create Luma API service layer
- Implement polling service for events and check-ins
- Add automatic NFT minting on check-in detection
- Set up Socket.io for real-time updates
- Add Luma API key management in Settings
- Test complete workflow end-to-end

### Week 4: Testing & Optimization
- Frontend integration testing
- Performance optimization and caching
- Error handling and edge cases
- Rate limiting and API quota management
- Documentation and deployment preparation
- Load testing with real Luma events

## ✅ Success Criteria

### Functional Requirements
- Wallet-based authentication works seamlessly
- All existing frontend functionality preserved
- Real-time event sync from Luma via polling
- Design upload and application to events
- "View on Chain" blockchain verification
- Complete Docker-based local development

### Technical Requirements
- 90% reduction in backend codebase size
- Sub-200ms API response times
- Real-time updates delivered within 5-10 seconds
- Proper error handling and retry logic
- Comprehensive logging and monitoring
- Respectful API usage with rate limiting

### User Experience Requirements
- No learning curve - same UI/UX as current system
- Near-instant event updates when created in Luma (within 10 seconds)
- Automatic NFT delivery within 5-10 seconds of check-in
- Easy one-time Luma API key setup in Settings
- Clear real-time feedback for all operations
- Toast notifications for important updates

## 🎯 Key Advantages of This Approach

### Simplified Architecture
- Single source of truth (Luma) for all events
- No duplicate event management
- Reduced backend complexity
- Cleaner data flow

### Real-Time Experience
- Live updates without page refresh
- Instant feedback on check-ins
- Automatic NFT minting
- WebSocket-powered notifications

### Developer Experience
- Familiar JavaScript/Node.js ecosystem
- Hot reload development with Docker
- Better debugging and monitoring
- Easier deployment and scaling

## 🔧 Technical Considerations

### API Rate Limiting
- Respect Luma API rate limits
- Implement exponential backoff
- Queue requests during peak usage
- Monitor API quota usage

### Error Handling
- Graceful degradation when Luma API is down
- Retry logic for failed NFT minting
- User-friendly error messages
- Comprehensive logging for debugging

### Security
- Encrypted Luma API key storage
- JWT token validation
- Input validation and sanitization
- CORS configuration for frontend

### Performance
- Database query optimization
- Caching for frequently accessed data
- Efficient polling intervals
- Connection pooling for database

This migration will transform your system into a streamlined, automated NFT attendance platform that perfectly integrates with your Luma Pro account while maintaining all existing functionality and adding real-time capabilities.