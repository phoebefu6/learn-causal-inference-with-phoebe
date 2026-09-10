# Official course map - learn-causal-inference-with-phoebe

Built 2026-09-10. Hub bucket `ds` (Data Science), difficulty tier 4. Flips the hub's existing
`planned` entry live. Two tracks: leader 6 x 45 min, practitioner 10 x 45 min.

Running artifact: a **causal claim you can defend** about one intervention - the re-engagement
email at **Kestrelmark**, a fictional subscription retailer. 5,000 customers, generated from a
written structural causal model, so the true effect is known and every estimate can be scored.

---

## The seam - read this before writing a single page

**This course was re-scoped on 2026-09-10 because the hub's original blurb overlapped about 60
percent with `learn-experimentation-with-phoebe`, which is already live.** That course owns
estimation from observational data. This one owns the causal model: what question is being asked,
whether it can be answered at all, and what must NOT be conditioned on.

| Sibling | What it already owns, live | What this course does instead |
|---|---|---|
| `learn-experimentation-with-phoebe` (ds, d3) | b1 "Potential outcomes and the estimand"; b8 "Geo experiments and synthetic control"; b9 "Difference-in-differences" with TWFE and event study; **b10 "Observational causal inference" - DAGs, the backdoor criterion, propensity scores, IPW, doubly robust, DoWhy, refutation**; a5 "When you can't randomize" | **No estimation method is taught here.** No propensity scores, no IPW, no doubly robust, no DiD, no synthetic control, no DoWhy. The backdoor criterion appears only as the identification question ("is there a set that closes the back doors, and does it exist in your data"), never as a fitting recipe. Every page that reaches for an estimator names the experimentation course and stops |
| `learn-statistics-with-phoebe` (ds, d2) | b10 "Correlation, regression and fallacies" | Regression appears only as the arithmetic the bench runs. No inference, no standard errors, no hypothesis testing |
| `learn-decision-intelligence-with-phoebe` (lead) | Decision framing, calibration, value of information | Nothing about decision quality. This is about whether a specific claim is identified |
| `learn-marketing-attribution-with-phoebe` (aiap) | MMM, MTA, Shapley, Markov, incrementality, geo-lift | Attribution as a business problem stays there. a2's claim audit uses a marketing headline as one example and does not teach any attribution method |
| `learn-ml-strategy-with-phoebe` (ds, d3) | Error analysis, ceilings, what to fix next | No overlap; different question entirely |

**What this course uniquely owns:** the ladder as an epistemology; identification versus
estimation; **what not to adjust for** (colliders, mediators, M-bias, Simpson, Berkson); the
front-door criterion; counterfactuals as rung 3; heterogeneous effects, CATE and uplift targeting;
and auditing a causal claim in the wild.

---

## Verified facts (with their source tier)

**Tier 1, the framework, from Pearl's published work and widely reproduced formal statements.**

- **The Ladder of Causation** (Pearl and Mackenzie, *The Book of Why*), three rungs:
  **rung 1 association** - observing regularities, questions about the joint distribution of
  observed variables, "what does seeing X tell me about Y"; **rung 2 intervention** - the
  probability of an outcome when a variable is forced to a value, "what happens if I do X";
  **rung 3 counterfactuals** - reasoning about an alternative world that did not happen, which
  requires modelling two worlds at once and therefore a fully specified causal model.
  A rung-2 question cannot be answered with rung-1 information alone.
- **Back-door criterion** (Pearl): a set Z satisfies it relative to an ordered pair (X, Y) in a
  causal diagram if (i) no node in Z is a descendant of X, and (ii) Z blocks every path between X
  and Y that contains an arrow into X. Condition (i) rules out consequences of X; condition (ii)
  is what makes Z the right set of confounding factors.
- **Collider**: in a structure `i -> m <- j`, conditioning on m (or any descendant of m)
  makes i and j dependent when they were independent. Known in epidemiology as Berkson's paradox.
- **M-bias**: adjusting for a pre-treatment collider in the shape `A <- U1 -> C <- U2 -> Y`
  induces bias even though C precedes treatment, which is why "it was measured before the
  treatment" is not a safety argument.

**Tier 2, method names used for orientation, never taught as recipes.**

- Meta-learners for heterogeneous treatment effects (Künzel et al., 2019): **S-learner** (one
  model with treatment as a feature; regularisation biases the effect toward zero and a weak
  effect can be ignored entirely), **T-learner** (separate models per arm; avoids missing a weak
  effect, still suffers regularisation), **X-learner** (imputes counterfactual outcomes, regresses
  on the pseudo-effects and weights the two fits by propensity; suited to treated/control
  imbalance, which is the norm outside experiments).
- **Qini curve / AUUC**: an uplift-model comparison plot read like an ROC curve, where distance
  above the diagonal is the gain from targeting by predicted uplift rather than at random.

**Nothing on the p10 bench is modelled.** The data comes from a structural causal model written
out in the source file; the true effect is computed by brute-force intervention; every estimate is
a real least-squares fit.

---

## Frozen canon - RECOMPUTED 2026-09-10 after the engine gained real heterogeneity

**Why the engine changed.** The first engine gave every customer an effect of 5.0 or 8.0, with the
5-or-8 decided by a coin flip independent of every observed feature (measured R^2 of season,
tenure, loyalty and device on the individual effect: **0.001**). On that data a5's four groups,
p7's CATE and p8's Qini were all teaching heterogeneity that did not exist: a real uplift model
could only fit noise, and no ranking could beat a blanket send because **nobody was harmed**.
The engine now carries a `recency` segment, so the heterogeneity is real and predictable.

**The model** (5,000 rows, one fixed seed, `assets/causal-live.js`). `season` and `tenure` cause
both the email and spend. `u1` and `u2` are unobserved; `u1` causes the email, `u2` causes spend,
and both cause `loyalty`, making it a **pre-treatment collider**. The email causes `opened`, which
causes spend (**mediator**, +3.0 when it flips). The email and spend both cause `ticket`
(**post-treatment collider**). `device` is a bystander. **`recency` is an effect modifier**: it
sets how much the email is worth to that person and shifts baseline spend, but it does **not**
cause the email, so the back-door set is still `{season, tenure}` and every DAG in p1-p3 stands.

| `recency` | Who | Share | Effect of the email |
|---|---|---|---|
| 0 | active, "sure thing" | 22.4% (1,120) | **+2.10** |
| 1 | lapsed 30-90 days, "persuadable" | 20.4% (1,022) | **+29.09** |
| 2 | dormant 12 months, "lost cause" | 49.3% (2,465) | **+1.04** |
| 3 | cancelled once, "sleeping dog" | 7.9% (393) | **-8.87** |

Headcounts are out of 5,000. The p7/p8 split holds out the last 1,500 rows, so 3,500 train.

**The truth: 6.23.** Computed by forcing the email on for everyone, then off, and differencing
mean spend. The analytic value is 6.22 (mean direct effect 5.161 plus 3.0 times the change in open
rate, 1.056), so the engine agrees with the algebra rather than with itself.

| Adjustment set | Estimate | Bias |
|---|---|---|
| Nothing | 10.54 | **+4.31** |
| **{season, tenure}** - the back-door set | **6.56** | **+0.33** |
| + loyalty (pre-treatment collider, M-bias) | 5.26 | -0.97 |
| + opened (mediator) | 5.48 | -0.75 |
| + ticket (post-treatment collider) | 2.59 | **-3.64** |
| + device (bystander) | 6.56 | +0.33 |
| Everything in the table | 0.98 | **-5.25** |

**Noise versus bias, measured across five seeds** (this replaces the old "+0.08 is tiny" line and
is a better lesson). Bias of the back-door set: +0.33, +0.17, -0.38, +0.19, -0.01, **mean +0.06**
- it changes sign, so the residual is sampling noise around zero. Every contaminated set keeps the
same sign in all five: loyalty about -1.2, opened about -1.0, ticket about -3.7, everything about
-5.2. **A wrong adjustment is bias; the correct one leaves noise.**

**The three readings that carry the course:**

1. **Confounding inflates, by two thirds.** 10.54 against 6.23: winter and long-tenured customers
   both get more email and spend more anyway.
2. **Adjusting for the mediator returns roughly the direct effect.** 5.48 against a mean direct
   effect of 5.16. Not "wrong" so much as an answer to a different question.
3. **Wrong adjustments compound rather than cancel.** All three harmful additions push the same
   way, stacking to -5.25 against the correct set's +0.33.

**The claim that flipped.** On the OLD engine, "adjust for everything" (3.22) was **not** worse
than "adjust for nothing" (4.09), and the course was written to refuse that claim. On this engine
it **is** worse: **5.25 against 4.31**, because the post-treatment collider alone now costs 3.64.
Pages must state the measured comparison, not the slogan, and the old refusal text has to go.

**The bystander is still genuinely harmless** (+0.33, identical to the back-door set to 0.01).

## Frozen canon - p7 and p8, the heterogeneity pages

- **CATE is now recoverable.** `recency` alone explains the individual effect with **R^2 = 0.986**.
- **Qini, 1,500-row holdout, ranked by true segment uplift.** Top 20% -> 8,715 units; 40% ->
  9,849; 60% -> 10,239; 80% -> 10,530; **peak at the top 92.5% -> 10,731**; 100% (blanket) ->
  **9,729**. Treating everyone gives away **1,002 units** against stopping before the sleeping
  dogs. The peak exists because 111 of the 1,500 are genuinely harmed.
- **Cost-aware targeting, at a5's fully loaded 7.00 per send.** Only persuadables clear the bar
  (29.09 against 7.00). Sure things (2.10), lost causes (1.04) and sleeping dogs (-8.87) all lose
  money. **A blanket send is net -3,848; sending only to the 20.4% persuadable segment is
  +22,578.** The positive average effect of 6.23 hides a programme that destroys value as run.

## Frozen canon - p6 individual effects, p7 CATE, p8 Qini curves

**Every individual effect in the model** (5,000 customers). The effect is the segment's direct
effect, plus 3.0 when the email is what tips that person into opening. Eight values, no others:

| Effect | Count | Segment |
|---|---|---|
| -10.0 | 245 | sleeping dog |
| -7.0 | 148 | sleeping dog |
| 0.0 | 1,614 | lost cause |
| +1.0 | 709 | sure thing |
| +3.0 | 851 | lost cause |
| +4.0 | 411 | sure thing |
| +28.0 | 650 | persuadable |
| +31.0 | 372 | persuadable |

**p7, CATE.** `recency` alone explains the individual effect with **R^2 = 0.986**. Segment CATEs:
sure thing +2.10 (individuals are 1.0 or 4.0), persuadable +29.09 (28.0 or 31.0), lost cause
+1.04 (0.0 or 3.0), sleeping dog -8.87 (-10.0 or -7.0). **The nuance p7 should teach:** the
segment effect is fully recoverable, the individual effect is not - within every segment there is
still a 3.0 coin flip nobody can predict. A model can tell you which group somebody is in; it
cannot tell you what the email will do to that person.

**p8, Qini on a 1,500-row holdout.** Cumulative incremental spend, by decile of the ranking:

| Decile | Ranked by predicted UPLIFT | Ranked by likelihood to BUY |
|---|---|---|
| 10% | 4,368 | 4,245 |
| 20% | 8,715 | 5,792 |
| 30% | 9,543 | 6,364 |
| 40% | 9,849 | 7,082 |
| 50% | 10,062 | 7,667 |
| 60% | 10,239 | 8,069 |
| 70% | 10,383 | 8,725 |
| 80% | 10,530 | 9,096 |
| 90% | **10,698** | 9,644 |
| 100% | 9,729 | 9,729 |

Both rankings end at the same 9,729, because treating everybody is the same campaign whatever
order you did it in. Qini coefficients: uplift **4,061**, likelihood-to-buy **2,290**, a perfect
ranking **4,298**, so normalised the uplift model scores **0.94** and the buy-likelihood ranking
**0.53**. The decisive difference is not the coefficient: **only the uplift ranking has a peak
below 100%** (10,698 at the ninth decile, and 10,731 at the true optimum of 92.5%), worth about
1,000 units against a blanket send. Ranking by who will buy never beats treating everybody,
because it sorts on the wrong quantity.

## Frozen canon - the p9 sensitivity sweep

An unmeasured cause `u` is wired into both arms at strength `s` in tenure-per-standard-deviation
units (tenure pair 0.7 on the email and 5.0 on spend; season pair 0.45 and 3.0, so one season is
0.62 tenures). **A cause positive on both arms inflates the estimate**, so the sweep asks how much
of what you see it could be supplying; the tipping point is where it accounts for all of it.

| Adjustment set | Estimate at s=0 | Tipping point |
|---|---|---|
| {season, tenure} | 6.56 | **1.55 tenures = 2.49 seasons** |
| + loyalty (collider) | 5.26 | **1.34 tenures = 2.15 seasons** |

Effect remaining, correct set: s=0.50 -> 5.82, s=1.00 -> 3.60, s=1.50 -> 0.44, s=2.00 -> -3.40.
**The trap:** 1.34 against 1.55 is a 14 percent difference in the robustness claim while the
estimate underneath is already 1.30 low.

**Two earlier drafts were wrong and were rebuilt.** p9 first quoted 1.58 / 2.54 / 1.40 from code
referencing `df`, `spend_base` and `email_logit` - none of which exist, one of which embeds the
unobserved `u1` - with the confounder sign backwards. p8 first quoted a Qini of 0.73 and a peak of
10,440 beating a 9,120 blanket send, on data where no ranking could beat a blanket send at all.
Every number in this file is now computed, and the code each page shows is the code that computed
it.

## Coverage per session

`✓` = taught to working depth. `◐` = named and handed to the session or course that owns it.

### Leader track

| Session | Covers | Depth |
|---|---|---|
| a1 Three questions, three rungs | The ladder; why a rung-2 question cannot be answered with rung-1 data; the 10.54-vs-6.23 gap as the cost | ✓ |
| a2 The claim audit | Reading a published claim and naming its rung, its assumed graph and its unmeasured confounder | ✓ |
| a3 What not to adjust for | Colliders, mediators, M-bias, Simpson, Berkson, with the canon numbers | ✓ |
| a4 Identifiable or not | Identification as a design question that precedes data collection; what to commission | ✓ |
| a5 Not everyone responds | Average effects hide heterogeneity; why the average can be positive and the policy still wrong | ✓ |
| a6 Commissioning and reading a causal claim | The five questions to ask; what to require in writing | ✓ |
| Estimators (propensity, IPW, DiD, synthetic control) | Named once, handed to `learn-experimentation` | ◐ |

### Practitioner track

| Session | Covers | Depth |
|---|---|---|
| p1 Draw the DAG before touching the data | The graph as the assumption set; nodes, arrows, what an arrow claims | ✓ |
| p2 Confounder, collider, mediator | The three shapes, what each does when conditioned on, with the bench's own variables | ✓ |
| p3 Identification before estimation | Back-door criterion stated formally; is there a valid set, and is it in your data | ✓ |
| p4 The front door | When the back door is blocked by an unmeasured confounder and a mediator rescues it | ✓ |
| p5 Simpson's paradox | Reproduced from real numbers; why the aggregate and the strata disagree and which to believe | ✓ |
| p6 Counterfactuals | Rung 3: would this customer have churned anyway; what a fully specified model buys | ✓ |
| p7 CATE and uplift | S-, T- and X-learners named with their documented weaknesses | ✓ |
| p8 Qini curves and who to treat | Targeting by predicted uplift against targeting at random | ✓ |
| p9 Sensitivity analysis | How strong an unmeasured confounder would have to be to overturn the finding | ✓ |
| p10 The adjustment bench | The full canon, all six sets, the three readings | ✓ |
| Fitting propensity scores, IPW, DoWhy | Pointed at `learn-experimentation` b10 | ◐ |

## Not covered, by design

- **Every observational estimator.** Propensity scores, IPW, doubly robust, DiD, synthetic
  control, DoWhy: all live in `learn-experimentation`, and this course points there by name.
- **Running experiments.** Same course.
- **Statistical inference.** No standard errors, no p-values; `learn-statistics` owns those.
- **Full do-calculus.** The three rules are named in p4 as the general machinery behind the
  front-door result; they are not derived.
- **Attribution modelling.** The marketing attribution course.

## Re-verify before delivery

Nothing here moves. The ladder and the back-door criterion are stable published results, and the
bench is deterministic from a fixed seed. If the engine is ever edited, re-run the node ladder and
update every number in this file before touching a page.
