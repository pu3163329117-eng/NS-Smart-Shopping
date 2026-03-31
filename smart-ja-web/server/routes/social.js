const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { ensureArray } = require('../utils/dataMappers');
const { getOrSetCache, invalidateCache } = require('../utils/redis');

// 1. 获取帖子瀑布流 (带分页)
router.get('/posts', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `social:posts:page:${page}:limit:${limit}`;
        // Cache the entire database query for 15 seconds to absorb high-concurrency traffic
        const result = await getOrSetCache(cacheKey, 15, async () => {
            const postsQuery = await prisma.post.findMany({
                where: { status: 'published' },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { id: true, username: true, avatar: true } },
                    _count: { select: { comments: true, likedBy: true } }
                }
            });
            const totalQuery = await prisma.post.count({ where: { status: 'published' } });
            return { posts: postsQuery, total: totalQuery };
        });

        const { posts, total } = result;

        res.json({
            data: posts,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

// 2. 获取单个帖子和它的评论
router.get('/posts/:id', async (req, res, next) => {
    try {
        const post = await prisma.post.findUnique({
            where: { id: req.params.id },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                comments: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: { select: { id: true, username: true, avatar: true } }
                    }
                },
                _count: { select: { likedBy: true } }
            }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // 如果登录了，查一下有没有点过赞
        let isLikedByMe = false;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            // Optional: Parse token and check like status...
        }

        res.json({ ...post, isLikedByMe });
    } catch (error) {
        next(error);
    }
});

// 3. 发布帖子 (必须登录)
router.post('/posts', authenticateToken, async (req, res, next) => {
    try {
        const { content, images, tags } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const post = await prisma.post.create({
            data: {
                userId: req.user.id,
                content,
                images: ensureArray(images),
                tags: ensureArray(tags),
            },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                _count: { select: { comments: true, likedBy: true } }
            }
        });

        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
});

// 4. 点赞/取消点赞
router.post('/posts/:id/like', authenticateToken, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const existingLike = await prisma.like.findUnique({
            where: { userId_postId: { userId, postId } }
        });

        if (existingLike) {
            // 取消点赞
            await prisma.$transaction([
                prisma.like.delete({ where: { id: existingLike.id } }),
                prisma.post.update({
                    where: { id: postId },
                    data: { likes: { decrement: 1 } }
                })
            ]);
            return res.json({ message: 'Unliked', isLiked: false, likes: post.likes - 1 });
        } else {
            // 点赞
            await prisma.$transaction([
                prisma.like.create({ data: { userId, postId } }),
                prisma.post.update({
                    where: { id: postId },
                    data: { likes: { increment: 1 } }
                })
            ]);
            return res.json({ message: 'Liked', isLiked: true, likes: post.likes + 1 });
        }
    } catch (error) {
        next(error);
    }
});

// 5. 发表评论
router.post('/posts/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'Content is required' });

        const postId = req.params.id;

        const comment = await prisma.$transaction(async (tx) => {
            const newComment = await tx.comment.create({
                data: {
                    postId,
                    userId: req.user.id,
                    content
                },
                include: {
                    author: { select: { id: true, username: true, avatar: true } }
                }
            });

            await tx.post.update({
                where: { id: postId },
                data: { commentsCount: { increment: 1 } }
            });

            return newComment;
        });

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
});

// 6. 删除帖子
router.delete('/posts/:id', authenticateToken, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await prisma.post.findUnique({ where: { id: postId } });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Permission denied' });
        }

        await prisma.$transaction([
            prisma.like.deleteMany({ where: { postId } }),
            prisma.comment.deleteMany({ where: { postId } }),
            prisma.post.delete({ where: { id: postId } })
        ]);

        invalidateCache('social:posts:*');
        res.json({ message: 'Post deleted successfully', success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
