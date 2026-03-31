const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');

// 获取用户的所有孵化项目
router.get('/projects', authenticateToken, async (req, res) => {
    try {
        const projects = await prisma.incubationProject.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// 获取单个孵化项目
router.get('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const project = await prisma.incubationProject.findUnique({
            where: { id: req.params.id }
        });
        if (!project || project.userId !== req.user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// 创建新的孵化项目
router.post('/projects', authenticateToken, async (req, res) => {
    try {
        const { name, description, leanCanvas, prd, status } = req.body;
        const project = await prisma.incubationProject.create({
            data: {
                userId: req.user.id,
                name: name || '未命名想法',
                description,
                leanCanvas,
                prd,
                status: status || 'pitching'
            }
        });
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// 更新孵化项目 (如保存画布、改变状态)
router.put('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, leanCanvas, prd, status } = req.body;
        
        // Ensure user owns it
        const existing = await prisma.incubationProject.findUnique({ where: { id: req.params.id }});
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({ error: 'Not found' });
        }

        const project = await prisma.incubationProject.update({
            where: { id: req.params.id },
            data: {
                name,
                description,
                leanCanvas,
                prd,
                status
            }
        });
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

module.exports = router;
