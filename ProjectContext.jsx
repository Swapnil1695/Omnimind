import { createContext, useState, useContext, useCallback } from 'react';
import { projectService } from '../services/project.service';
import { toast } from 'react-hot-toast';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (projectData) => {
    setLoading(true);
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      toast.success('Project created successfully');
      return newProject;
    } catch (err) {
      setError(err.message || 'Failed to create project');
      toast.error('Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id, updates) => {
    setLoading(true);
    try {
      const updated = await projectService.updateProject(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      if (activeProject?.id === id) {
        setActiveProject(updated);
      }
      toast.success('Project updated successfully');
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update project');
      toast.error('Failed to update project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id) => {
    setLoading(true);
    try {
      await projectService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      toast.success('Project deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete project');
      toast.error('Failed to delete project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProjectById = (id) => {
    return projects.find(p => p.id === id);
  };

  const selectProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setActiveProject(project || null);
  };

  const clearActiveProject = () => {
    setActiveProject(null);
  };

  const addTaskToProject = async (projectId, taskData) => {
    const project = getProjectById(projectId);
    if (!project) return;

    const updatedTasks = [...(project.tasks || []), taskData];
    await updateProject(projectId, { tasks: updatedTasks });
  };

  const updateTaskInProject = async (projectId, taskId, updates) => {
    const project = getProjectById(projectId);
    if (!project) return;

    const updatedTasks = project.tasks?.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ) || [];
    
    await updateProject(projectId, { tasks: updatedTasks });
  };

  const deleteTaskFromProject = async (projectId, taskId) => {
    const project = getProjectById(projectId);
    if (!project) return;

    const updatedTasks = project.tasks?.filter(task => task.id !== taskId) || [];
    await updateProject(projectId, { tasks: updatedTasks });
  };

  const value = {
    projects,
    activeProject,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectById,
    selectProject,
    clearActiveProject,
    addTaskToProject,
    updateTaskInProject,
    deleteTaskFromProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};