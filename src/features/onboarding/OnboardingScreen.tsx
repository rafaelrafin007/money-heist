import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
import {
  getNextOnboardingIndex,
  getOnboardingExitHref,
  getPreviousOnboardingIndex,
  shouldIgnoreOnboardingExitPress,
  type OnboardingExitTarget,
} from "@/src/features/onboarding/onboardingRouting";
import { theme } from "@/src/theme";

type OnboardingStep = {
  title: string;
  eyebrow: string;
  detail: string;
  bullets: string[];
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

const steps: OnboardingStep[] = [
  {
    eyebrow: "Money Heist",
    title: "Track, plan, and save with clarity.",
    detail: "Build a clear picture of your money from accounts, transactions, budgets, goals, and monthly plans.",
    bullets: ["See balances", "Understand cash flow", "Estimate potential savings"],
    icon: "shield-checkmark-outline",
  },
  {
    eyebrow: "Track your money",
    title: "Record income, expenses, and transfers.",
    detail: "Income and expenses stay separate. Transfers move money between your own accounts without counting as income or spending.",
    bullets: ["Add accounts", "Record income", "Move money safely"],
    icon: "swap-horizontal-outline",
  },
  {
    eyebrow: "Plan ahead",
    title: "Use budgets, goals, and a monthly plan.",
    detail: "Budgets show spending room. Savings goals follow linked savings accounts. Monthly plans power potential-savings estimates.",
    bullets: ["Create budgets", "Link savings goals", "Complete monthly plan"],
    icon: "pie-chart-outline",
  },
  {
    eyebrow: "Get started",
    title: "Set up the first useful pieces.",
    detail: "Start with one account, then add income, expenses, savings transfers, budgets, and a monthly plan when ready.",
    bullets: ["Add first account", "Go to dashboard", "Use the checklist"],
    icon: "rocket-outline",
  },
];

export function OnboardingScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string>();
  const hasNavigatedRef = useRef(false);
  const { completeOnboarding } = useOnboarding();
  const current = steps[index];
  const isLastStep = index === steps.length - 1;
  const isReplay = params.mode === "replay";

  function continueToNextStep() {
    setIndex((currentIndex) => getNextOnboardingIndex(currentIndex, steps.length));
  }

  async function finish(target: OnboardingExitTarget = "dashboard") {
    if (shouldIgnoreOnboardingExitPress(isCompleting, hasNavigatedRef.current)) {
      return;
    }

    setIsCompleting(true);
    setCompletionMessage(undefined);

    try {
      const result = await completeOnboarding();
      if (!result.ok) {
        setCompletionMessage("Your guide progress may need to be saved again later.");
      }

      hasNavigatedRef.current = true;
      router.replace(getOnboardingExitHref(target) as Href);
    } finally {
      if (!hasNavigatedRef.current) {
        setIsCompleting(false);
      }
    }
  }

  return (
    <AppScreen scroll contentStyle={[styles.screenContent, { paddingBottom: theme.spacing.xxxl + insets.bottom }]}>
      <View style={styles.progressRow}>
        {steps.map((step, stepIndex) => (
          <View
            accessibilityLabel={`Onboarding step ${stepIndex + 1} of ${steps.length}${stepIndex === index ? ", selected" : ""}`}
            key={step.title}
            style={[styles.progressDot, stepIndex === index ? styles.progressDotActive : null]}
          />
        ))}
      </View>

      <AppCard style={styles.heroCard}>
        <View style={styles.iconWrap}>
          <Ionicons color={theme.colors.success} name={current.icon} size={30} />
        </View>
        <View style={styles.copy}>
          <AppText tone="success" variant="label">{current.eyebrow}</AppText>
          <AppText variant="headline">{current.title}</AppText>
          <AppText tone="subtle">{current.detail}</AppText>
        </View>
        <View style={styles.bullets}>
          {current.bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Ionicons color={theme.colors.success} name="checkmark-circle-outline" size={18} />
              <AppText variant="label">{bullet}</AppText>
            </View>
          ))}
        </View>
      </AppCard>

      {isLastStep ? (
        <View style={styles.actions}>
          <AppButton disabled={isCompleting} loading={isCompleting} onPress={() => void finish("first-account")} title="Add first account" />
          <AppButton disabled={isCompleting} onPress={() => void finish("dashboard")} title="Take me to Dashboard" variant="secondary" />
          <AppButton disabled={isCompleting} onPress={() => void finish("dashboard")} title={isReplay ? "Exit guide" : "Skip for now"} variant="ghost" />
        </View>
      ) : (
        <View style={styles.actions}>
          <AppButton disabled={isCompleting} onPress={continueToNextStep} title="Continue" />
          <AppButton disabled={isCompleting} onPress={() => void finish("dashboard")} title={isReplay ? "Exit guide" : "Skip for now"} variant="ghost" />
        </View>
      )}

      {completionMessage ? (
        <AppText style={styles.warning} tone="subtle" variant="caption">
          {completionMessage}
        </AppText>
      ) : null}

      {index > 0 ? (
        <Pressable accessibilityRole="button" disabled={isCompleting} onPress={() => setIndex((currentIndex) => getPreviousOnboardingIndex(currentIndex))} style={styles.backButton}>
          <AppText tone="subtle" variant="label">Back</AppText>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: theme.spacing.xxxl,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  progressDot: {
    height: 8,
    width: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  heroCard: {
    alignItems: "center",
    gap: theme.spacing.lg,
    ...theme.shadows.card,
  },
  iconWrap: {
    height: 72,
    width: 72,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.successSurface,
  },
  copy: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  bullets: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  backButton: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
  warning: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSurface,
  },
});
