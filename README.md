# LineLink Frontend

A modern, responsive web application for managing work orders and production line operations. Built with Next.js and featuring a clean, intuitive interface for tracking work orders, missing parts, and production schedules.

## Features

- **Work Order Management** - Track and manage work orders with ease
- **Production Calendar** - Visualize production schedules with FullCalendar integration
- **Missing Parts Tracking** - Keep track of missing components affecting production
- **Responsive Design** - Fully responsive layout that works on all devices
- **Modern UI/UX** - Built with TailwindCSS and Framer Motion for smooth animations
- **State Management** - Powered by Redux Toolkit for efficient state management

## Technologies Used

- **Frontend Framework**: Next.js 15.4.1 with React 19
- **Styling**: TailwindCSS with custom animations
- **State Management**: Redux Toolkit
- **Calendar**: FullCalendar
- **Date Handling**: date-fns
- **UI Components**: Lucide Icons, Recharts
- **Form Handling**: React Hook Form
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/LineLink-Frontend.git
   cd LineLink-Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the required environment variables.

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Project Structure

```
linelink/
├── app/                 # App router pages and layouts
├── components/          # Reusable UI components
├── contexts/            # React contexts
├── public/              # Static assets
├── store/               # Redux store configuration
├── types/               # TypeScript type definitions
├── middleware.ts        # Next.js middleware
└── tailwind.config.js   # TailwindCSS configuration
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the need for efficient production line management
- Built with modern web technologies for optimal performance

## Favorite Quotes

> "The impediment to action advances action. What stands in the way becomes the way." - _Marcus Aurelius_

> "Success is not final, failure is not fatal: it is the courage to continue that counts." - _Winston Churchill_