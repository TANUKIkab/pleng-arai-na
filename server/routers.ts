import { z } from 'zod';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { systemRouter } from './_core/systemRouter';
import { publicProcedure, router } from './_core/trpc';
import { evaluateSearch, getFacets, getFeaturedSongs, getSuggestions, searchSongs } from './ir';

const feedbackLog: Array<{ songId: number; query: string; relevant: boolean; createdAt: number }> = [];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  songs: router({
    featured: publicProcedure.query(() => getFeaturedSongs()),
    facets: publicProcedure.query(() => getFacets()),
    suggestions: publicProcedure.input(z.object({ prefix: z.string().max(80), limit: z.number().min(1).max(12).default(8) })).query(({ input }) => getSuggestions(input.prefix, input.limit)),
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(300),
        mode: z.enum(['lyrics', 'mood']),
        feedback: z.array(z.object({ songId: z.number(), relevant: z.boolean() })).optional(),
        genre: z.string().optional(),
        moods: z.array(z.string()).optional(),
        sort: z.enum(['relevance', 'title', 'artist']).optional(),
      }))
      .query(({ input }) => searchSongs(input)),
    feedback: publicProcedure
      .input(z.object({ songId: z.number(), query: z.string().max(300), relevant: z.boolean() }))
      .mutation(({ input }) => {
        feedbackLog.push({ ...input, createdAt: Date.now() });
        return { success: true, total: feedbackLog.length } as const;
      }),
    evaluation: publicProcedure.query(() => evaluateSearch()),
  }),
});

export type AppRouter = typeof appRouter;
