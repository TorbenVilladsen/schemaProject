import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders the app title', () => {
    renderSidebar()
    expect(screen.getByText('Scheduler')).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Classes')).toBeInTheDocument()
    expect(screen.getByText('Teachers')).toBeInTheDocument()
    expect(screen.getByText('Subjects')).toBeInTheDocument()
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('Timeslots')).toBeInTheDocument()
    expect(screen.getByText('Schedules')).toBeInTheDocument()
    expect(screen.getByText('Setup')).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('Classes').closest('a')).toHaveAttribute('href', '/classes')
    expect(screen.getByText('Teachers').closest('a')).toHaveAttribute('href', '/teachers')
    expect(screen.getByText('Subjects').closest('a')).toHaveAttribute('href', '/subjects')
    expect(screen.getByText('Rooms').closest('a')).toHaveAttribute('href', '/rooms')
    expect(screen.getByText('Timeslots').closest('a')).toHaveAttribute('href', '/timeslots')
    expect(screen.getByText('Schedules').closest('a')).toHaveAttribute('href', '/schedules')
    expect(screen.getByText('Setup').closest('a')).toHaveAttribute('href', '/setup')
  })
})
