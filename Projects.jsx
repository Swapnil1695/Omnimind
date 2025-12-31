import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiPlus, FiFilter, FiSearch, FiGrid, FiList, FiCalendar,
  FiUsers, FiFlag, FiClock, FiMoreVertical, FiEdit, FiTrash2,
  FiArchive, FiShare2, FiBarChart2, FiChevronDown
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import ProjectCard from '../components/projects/ProjectCard';
import TaskList from '../components/projects/TaskList';
import TimelineView from '../components/projects/TimelineView';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { toast } from 'react-hot-toast';

const Projects = () => {
  const { projectId } = useParams();
  const { projects, loading, createProject, deleteProject, selectProject, activeProject } = useProjects();
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'planning',
    dueDate: '',
  });

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      if (filter === 'all') return true;
      if (filter === 'active') return project.status === 'in-progress';
      if (filter === 'planning') return project.status === 'planning';
      if (filter === 'completed') return project.status === 'completed';
      if (filter === 'mine') return project.owner === user?.id;
      return true;
    })
    .filter(project =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      if (sortBy === 'deadline') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

  const handleCreateProject = async () => {
    try {
      await createProject(newProjectData);
      setShowNewProjectModal(false);
      setNewProjectData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'planning',
        dueDate: '',
      });
      toast.success('Project created successfully!');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        toast.success('Project deleted successfully');
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  const filters = [
    { id: 'all', label: 'All Projects', count: projects.length },
    { id: 'active', label: 'Active', count: projects.filter(p => p.status === 'in-progress').length },
    { id: 'planning', label: 'Planning', count: projects.filter(p => p.status === 'planning').length },
    { id: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
    { id: 'mine', label: 'My Projects', count: projects.filter(p => p.owner === user?.id).length },
  ];

  const sortOptions = [
    { id: 'recent', label: 'Recently Updated' },
    { id: 'priority', label: 'Priority' },
    { id: 'deadline', label: 'Deadline' },
    { id: 'name', label: 'Name' },
  ];

  // If viewing a specific project
  if (projectId && activeProject) {
    return (
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link to="/projects" className="text-blue-600 dark:text-blue-400 hover:underline">
                Projects
              </Link>
              <span className="text-gray-400">/</span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {activeProject.title}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {activeProject.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <FiShare2 className="mr-2" />
              Share
            </Button>
            <Button>
              <FiEdit className="mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {activeProject.tasks?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Tasks
            </div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {activeProject.tasks?.filter(t => t.status === 'completed').length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Completed
            </div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {activeProject.progress || 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Progress
            </div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {activeProject.dueDate ? new Date(activeProject.dueDate).toLocaleDateString() : 'No deadline'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Deadline
            </div>
          </Card>
        </div>

        {/* Project Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {['Tasks', 'Timeline', 'Files', 'Team', 'Analytics'].map((tab) => (
              <button
                key={tab}
                className="py-3 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Project Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2">
            <Card title="Tasks">
              <TaskList projectId={projectId} />
            </Card>
          </div>

          {/* Timeline & Details */}
          <div className="space-y-6">
            <Card title="Timeline">
              <TimelineView projectId={projectId} />
            </Card>
            
            <Card title="Project Details">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${activeProject.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : activeProject.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {activeProject.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Priority</div>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${activeProject.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : activeProject.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                      {activeProject.priority}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Created</div>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {new Date(activeProject.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {activeProject.dueDate && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Due Date</div>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                      {new Date(activeProject.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main projects list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all your projects in one place
          </p>
        </div>
        
        <Button onClick={() => setShowNewProjectModal(true)}>
          <FiPlus className="mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters & Controls */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter tabs */}
          <div className="flex overflow-x-auto space-x-1">
            {filters.map((filterItem) => (
              <button
                key={filterItem.id}
                onClick={() => setFilter(filterItem.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === filterItem.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {filterItem.label}
                <span className={`ml-2 ${filter === filterItem.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  ({filterItem.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search and controls */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
              />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 appearance-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                title="Grid view"
              >
                <FiGrid className={`w-5 h-5 ${viewMode === 'grid' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                title="List view"
              >
                <FiList className={`w-5 h-5 ${viewMode === 'list' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 ${viewMode === 'timeline' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                title="Timeline view"
              >
                <FiCalendar className={`w-5 h-5 ${viewMode === 'timeline' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProjects.length > 0 ? (
        <AnimatePresence>
          {viewMode === 'grid' ? (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectCard
                    project={project}
                    onDelete={handleDeleteProject}
                    onSelect={() => selectProject(project.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {project.title.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {project.description || 'No description'}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                              {project.status}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${project.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                              {project.priority}
                            </span>
                            {project.dueDate && (
                              <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <FiClock className="w-3 h-3 mr-1" />
                                {new Date(project.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {project.progress || 0}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Progress
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Link
                            to={`/projects/${project.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="View"
                          >
                            <FiBarChart2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <TimelineView projects={filteredProjects} />
          )}
        </AnimatePresence>
      ) : (
        <Card className="text-center py-12">
          <div className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4">
            <FiGrid className="w-full h-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Create your first project to get started'}
          </p>
          <Button onClick={() => setShowNewProjectModal(true)}>
            <FiPlus className="mr-2" />
            Create Project
          </Button>
        </Card>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="Create New Project"
        size="medium"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={newProjectData.title}
              onChange={(e) => setNewProjectData({ ...newProjectData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter project title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newProjectData.description}
              onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Describe your project"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={newProjectData.priority}
                onChange={(e) => setNewProjectData({ ...newProjectData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={newProjectData.status}
                onChange={(e) => setNewProjectData({ ...newProjectData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={newProjectData.dueDate}
              onChange={(e) => setNewProjectData({ ...newProjectData, dueDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowNewProjectModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectData.title.trim()}
            >
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Projects;