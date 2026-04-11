const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const uuidv4 = () => require('crypto').randomUUID();

/**
 * @route GET /api/crowdfunding
 * @desc Get all active crowdfunding projects
 */
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.service.findMany({
      where: {
        type: 'crowdfunding',
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/crowdfunding/:id/support
 * @desc Support a crowdfunding project
 */
router.post('/:id/support', authenticateToken, async (req, res, next) => {
  try {
    const { amount, tierId } = req.body;
    const projectId = req.params.id;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid support amount' });
    }

    // 1. Fetch project
    const project = await prisma.service.findUnique({
      where: { id: projectId }
    });

    if (!project || project.type !== 'crowdfunding') {
      return res.status(404).json({ message: 'Crowdfunding project not found' });
    }

    // 2. Wrap in transaction: Update wallet + Create Order + Update Project Progress
    const result = await prisma.$transaction(async (tx) => {
      // Check user balance
      const user = await tx.user.findUnique({
        where: { id: userId }
      });

      if (user.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Deduct from wallet
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: amount }
        }
      });

      // Create transaction record
      await tx.userTransaction.create({
        data: {
          userId,
          type: 'payment',
          title: `Support Project: ${project.title}`,
          amount: -amount,
          balanceAfter: updatedUser.walletBalance,
          channel: 'wallet',
          status: 'completed'
        }
      });

      // Create Order
      const orderId = `CF-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const order = await tx.order.create({
        data: {
          id: orderId,
          buyerId: userId,
          serviceId: projectId,
          providerId: project.userId,
          amount: amount,
          status: 'paid',
          bizType: 'crowdfunding'
        }
      });

      // Update Project Stats
      const updatedProject = await tx.service.update({
        where: { id: projectId },
        data: {
          pledgedAmount: { increment: amount },
          backersCount: { increment: 1 }
        }
      });

      // Create Notification for the project owner (Maker)
      await tx.notification.create({
        data: {
          userId: project.userId,
          title: 'New Project Support',
          content: `User supported your project "${project.title}" with ¥${amount}.`,
          type: 'system',
          link: '/maker/orders'
        }
      });

      return { order, updatedProject };
    });

    res.json({
      message: 'Support successful',
      order: result.order,
      project: result.updatedProject
    });

  } catch (error) {
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json({ message: error.message });
    }
    next(error);
  }
});

/**
 * @route POST /api/crowdfunding/apply
 * @desc Apply for a roadshow or project launch
 */
router.post('/apply', authenticateToken, async (req, res, next) => {
  try {
    const { title, description, goalAmount, tags } = req.body;
    const userId = req.user.id;

    // Create a notification or audit entry for admins
    // For now, let's create a notification for the applicant themselves to confirm receipt
    await prisma.notification.create({
      data: {
        userId,
        title: 'Application Received',
        content: `Your application for "${title || 'New Project'}" has been received and is under review.`,
        type: 'system'
      }
    });

    // Also notify admins (if we had an admin user role, for now just log or notify the user)
    console.log(`[CF Apply] User ${userId} applied for: ${title}`);

    res.json({
      message: 'Application submitted successfully. Our team will review your roadshow request.',
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
