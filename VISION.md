# Snips - Vision & Scope

## Product Vision

Snips is a macOS-native snippet management tool designed primarily for building LLM prompts from a collection of reusable text snippets. It provides quick access via global shortcuts and a menubar interface, enabling users to search, select, and combine multiple snippets efficiently.

## Primary Use Case

The core workflow is assembling complex LLM prompts by searching for and selecting multiple smaller, reusable snippets (instructions, examples, context, etc.) and copying them as a single combined prompt to the clipboard.

## Target Platform

- **MVP**: macOS
- **Future**: Linux (high priority), Windows (lower priority)
- **Technology**: Tauri (cross-platform ready)

---

## MVP Feature Set (v1.0)

### Core Functionality

#### Snippet Management

- **Storage**: Local SQLite database
- **Format**: Plain text (users can use markdown if desired)
- **Properties**:
  - Globally unique name (required)
  - Content/text (required)
  - Description (optional)
  - Tags (optional, multiple)
- **No limits**: No restrictions on snippet length or total count

#### Quick Add Snippet

- Global shortcut captures currently selected text
- Prompts user for:
  - Name (required)
  - Description (optional)
  - Tags (optional)
  - Displays selected text for confirmation
- Saves to local database

#### Search & Selection Interface

- **Access**: Global shortcut (e.g., Cmd+Shift+S)
- **Search**: Real-time search across snippet names and tags
- **Weighted Results**: More frequently used snippets ranked higher
- **Multi-selection**:
  - Users can select multiple snippets
  - Snippets can be unselected
  - Window remains open during selection
  - Selection and final result can be reviewed
  - Visual indicator shows count of selected snippets
  - Count badge displayed in menubar icon (notification-style)
- **Copy to Clipboard**:
  - Single click or hotkey to copy all selected snippets
  - Snippets concatenated with newlines between them

#### Snippet Management UI

- Full CRUD operations (Create, Read, Update, Delete)
- Separate interface from search window
- Browse all snippets
- Edit snippet properties
- Delete snippets

#### Analytics & Usage Tracking

- Track snippet usage frequency
- Track recent usage
- Viewable analytics dashboard
- Usage data influences search ranking

#### Menubar Integration

- Persistent menubar icon
- Shows badge count when snippets are selected
- Quick access to main functions

---

## Future Enhancements (Post-MVP)

### v2.0 Features

#### Configurable Storage Backends

- Git repository sync (for version control and team sharing)
- Cloud service integration (for cross-device sync)
- Migration tools between storage types

#### Enhanced Concatenation

- Configurable separators between snippets
- Template options (numbered lists, custom formatting)
- Preview before copy

#### Advanced Organization

- Categories/folders in addition to tags
- Nested organization
- Bulk operations

### Future Considerations

#### LLM Integration

- AI-powered snippet enhancement
- Automatic snippet extraction from larger text blocks
- Smart snippet suggestions based on context
- Prompt optimization recommendations

#### Platform Expansion

- Windows support
- Mobile companion apps (view-only or limited editing)

#### Sharing & Collaboration

- Export/import snippet collections
- Share individual snippets or collections
- Community snippet library

#### Advanced Features

- Snippet variables/templates with placeholders
- Snippet chaining/workflows
- Keyboard-driven navigation
- Custom themes

---

## User Experience Principles

1. **Speed First**: Every interaction should be keyboard-driven and instant
2. **Minimal Friction**: Quick add and search should require minimal input
3. **Stay Out of the Way**: Menubar-only presence, no dock icon by default
4. **Local First**: Fast, reliable, works offline
5. **Transparent**: Clear visual feedback for all actions (selection count, copy confirmation)

---

## Technical Architecture

### Technology Stack

- **Framework**: Tauri (Rust + Web frontend)
- **Database**: SQLite (local storage)
- **Frontend**: TBD (React/Vue/Svelte)
- **Platform**: macOS (MVP), Linux & Windows (future)

### Key Technical Requirements

- Global keyboard shortcut registration
- Menubar icon with badge support
- System clipboard integration
- Fast full-text search
- Efficient storage and retrieval
- Usage analytics tracking

---

## Success Metrics

### MVP Launch Criteria

- Sub-100ms search response time
- Reliable global shortcuts on macOS
- Zero data loss (robust SQLite implementation)
- Intuitive UX requiring no documentation for core workflows

### Growth Metrics (Post-Launch)

- Daily active users
- Average snippets per user
- Average snippet reuse rate
- Time from shortcut to clipboard (efficiency metric)

---

## Non-Goals (Explicitly Out of Scope)

- Rich text editing or formatting
- Real-time collaboration
- Mobile-first experience
- Web-based interface
- AI features in MVP
- Cloud dependency

---

## Development Phases

### Phase 1: Foundation

- Basic Tauri app structure
- SQLite setup and schema
- Simple snippet CRUD

### Phase 2: Core UX

- Global shortcuts
- Menubar integration
- Search interface
- Multi-selection

### Phase 3: Polish

- Analytics tracking
- Usage-weighted search
- Management UI
- Performance optimization

### Phase 4: Release

- Testing and bug fixes
- Documentation
- macOS distribution/signing
- MVP launch

---

## Open Questions & Decisions Needed

1. Specific global shortcuts (defaults and customization)
2. Frontend framework selection
3. UI design system/components
4. macOS distribution method (App Store, DMG, Homebrew)
5. Analytics implementation (local only, privacy considerations)
6. Import/export format for MVP (if needed)

---

_This vision document is a living artifact and will be updated as the product evolves._
