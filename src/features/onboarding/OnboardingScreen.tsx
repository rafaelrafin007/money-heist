import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
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
  const [index, setIndex] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const current = steps[index];
  const isLastStep = index === steps.length - 1;

  async function finish(href: Href = "/dashboard") {
    await completeOnboarding();
    router.replace(href);
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
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
          <AppButton onPress={() => void finish("/accounts/new")} title="Add first account" />
          <AppButton onPress={() => void finish("/dashboard")} title="Go to dashboard" variant="secondary" />
          <AppButton onPress={() => void finish("/dashboard")} title="Skip for now" variant="ghost" />
        </View>
      ) : (
        <View style={styles.actions}>
          <AppButton onPress={() => setIndex((currentIndex) => currentIndex + 1)} title="Continue" />
          <AppButton onPress={() => void finish("/dashboard")} title="Skip for now" variant="ghost" />
        </View>
      )}

      {index > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setIndex((currentIndex) => Math.max(0, currentIndex - 1))} style={styles.backButton}>
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
});
