# Learn Causal Inference with Phoebe

Sixteen sessions on the part of causal work that happens before any estimator: which question is being asked, whether the data can answer it at all, and which columns in your table will make the answer worse if you control for them.

**Live:** https://phoebefu6.github.io/learn-causal-inference-with-phoebe/

Two tracks. **Leader, 6 sessions, no code:** the ladder of causation, auditing a claim that crosses your desk, what not to adjust for, whether a question is identifiable, why average effects hide who they help, and what to require in a brief. **Practitioner, 10 sessions:** the graph, the three shapes, the back-door criterion, the front door, Simpson's paradox, counterfactuals, CATE and uplift, targeting, sensitivity, and a bench.

- **The seam, stated because it decided the whole design.** `learn-experimentation-with-phoebe` already teaches every observational estimator: potential outcomes, propensity scores, inverse probability weighting, doubly robust methods, difference-in-differences, synthetic control and DoWhy. **This course teaches none of them.** It owns the causal model instead, and every page that reaches for an estimator names that course and stops.
- `assets/causal-live.js` holds the **adjustment bench**. Kestrelmark's 5,000 customers come from a structural causal model written out in the source, so the true effect is computed rather than estimated: run the model with the email forced on for everyone, then forced off, and difference the mean spend. It gives **6.23**, and the algebra independently predicts 6.22, so the engine is validated against theory rather than against itself.
- **The measured ladder.** Adjusting for nothing gives **10.54**, a bias of +4.31, because winter and long-tenured customers both get more email and spend more anyway. The back-door set of season and tenure gives **6.56**, from two columns everybody already had. Then it gets worse: the mediator gives 5.48, the pre-treatment collider **5.26 despite having been measured before the email went out**, and the post-treatment collider 2.59.
- **Noise is not bias, and the bench can tell them apart.** The back-door set's residual of +0.33 changes sign across five seeds (+0.33, +0.17, -0.38, +0.19, -0.01, mean +0.06), so it is sampling noise. Every contaminated set keeps the same sign every time. A wrong adjustment is bias; the correct one leaves noise.
- **Three findings worth the course.** Confounding is bias, not noise, so more rows give a more confident wrong answer. Adjusting for the mediator is not an error but an answer to a different question, recovering roughly the mean direct effect of 5.16. And the three harmful adjustments all push the same direction and **compound to -5.25** rather than cancelling, so a longer covariate list is not a hedge.
- **The average hides a programme that destroys value.** The effect is +29.09 for lapsed customers, +2.10 and +1.04 for two groups who were going to act anyway, and **-8.87 for the 7.9% the email drives away**. At the fully loaded cost of 7.00 a send, only the persuadable fifth clears the bar: a blanket send is net **-3,848**, and targeting that segment alone is **+22,578**, on an average effect that looks like a healthy +6.23.
- Running artifact: a **causal claim you can defend** about Kestrelmark's re-engagement email.
- Full source map, the enforced seam and the frozen canon: `materials/official-course-map.md`

by Phoebe Fu
