import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useInitializeDefaultCategories,
  useRestoreCategory,
  useUpdateCategory,
} from "@/src/features/categories/api/categoriesHooks";
import { InlineState } from "@/src/features/finance/components/InlineState";
import type { Category, CategoryKind } from "@/src/features/finance/types";
import { theme } from "@/src/theme";

export function CategoriesScreen() {
  const categories = useCategories();
  const initializeDefaults = useInitializeDefaultCategories();
  const [editingCategory, setEditingCategory] = useState<Category>();
  const [form, setForm] = useState({ name: "", kind: "expense" as CategoryKind });
  const [error, setError] = useState<string>();
  const create = useCreateCategory();
  const update = useUpdateCategory(editingCategory?.id ?? "");

  async function handleSave() {
    setError(undefined);
    try {
      if (editingCategory) {
        await update.mutateAsync({ name: form.name });
      } else {
        await create.mutateAsync(form);
      }
      setEditingCategory(undefined);
      setForm({ name: "", kind: "expense" });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Category could not be saved.");
    }
  }

  const income = (categories.data ?? []).filter((category) => category.kind === "income" && !category.isArchived);
  const expenses = (categories.data ?? []).filter((category) => category.kind === "expense" && !category.isArchived);
  const archived = (categories.data ?? []).filter((category) => category.isArchived);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText tone="subtle" variant="label">
            Organize transactions
          </AppText>
          <AppText variant="title">Categories</AppText>
        </View>
        <AppButton
          loading={initializeDefaults.isPending}
          onPress={() => void initializeDefaults.mutateAsync().catch((nextError) => setError(getMessage(nextError)))}
          title="Defaults"
          variant="secondary"
        />
      </View>

      {categories.isLoading ? <InlineState title="Loading categories" message="Fetching your categories." /> : null}
      {categories.error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(categories.error)}
          onAction={() => void categories.refetch()}
          title="We couldn't load your categories"
        />
      ) : null}

      <View style={styles.formCard}>
        <AppText variant="label">{editingCategory ? "Edit category" : "Add category"}</AppText>
        <AppTextInput
          label="Name"
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Food, Salary, Bills"
          value={form.name}
        />
        {!editingCategory ? (
          <View style={styles.chips}>
            <Chip active={form.kind === "income"} label="Income" onPress={() => setForm((current) => ({ ...current, kind: "income" }))} />
            <Chip active={form.kind === "expense"} label="Expense" onPress={() => setForm((current) => ({ ...current, kind: "expense" }))} />
          </View>
        ) : (
          <AppText tone="subtle" variant="caption">
            Category type is locked to preserve historical transactions.
          </AppText>
        )}
        {error ? (
          <AppText style={styles.error} tone="danger" variant="caption">
            {error}
          </AppText>
        ) : null}
        <AppButton loading={create.isPending || update.isPending} onPress={handleSave} title={editingCategory ? "Save category" : "Add category"} />
      </View>

      <CategorySection title="Income categories" categories={income} onEdit={beginEdit} />
      <CategorySection title="Expense categories" categories={expenses} onEdit={beginEdit} />
      <CategorySection title="Archived categories" categories={archived} onEdit={beginEdit} />
    </AppScreen>
  );

  function beginEdit(category: Category) {
    setEditingCategory(category);
    setForm({ name: category.name, kind: category.kind });
    setError(undefined);
  }
}

function CategorySection({
  title,
  categories,
  onEdit,
}: {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      {categories.length === 0 ? (
        <AppText tone="subtle" variant="caption">
          No categories in this section.
        </AppText>
      ) : (
        categories.map((category) => <CategoryRow key={category.id} category={category} onEdit={() => onEdit(category)} />)
      )}
    </View>
  );
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const archive = useArchiveCategory(category.id);
  const restore = useRestoreCategory(category.id);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string>();

  async function handleArchiveToggle() {
    setError(undefined);
    if (!category.isArchived && !confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    try {
      if (category.isArchived) {
        await restore.mutateAsync();
      } else {
        await archive.mutateAsync();
        setConfirmArchive(false);
      }
    } catch (nextError) {
      setError(getMessage(nextError));
    }
  }

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <AppText variant="label">{category.name}</AppText>
          <AppText tone="subtle" variant="caption">
            {category.kind} {category.isSystem ? "- default" : ""} {category.isArchived ? "- archived" : ""}
          </AppText>
          {confirmArchive ? (
            <AppText tone="danger" variant="caption">
              Press Archive again to confirm.
            </AppText>
          ) : null}
          {error ? (
            <AppText tone="danger" variant="caption">
              {error}
            </AppText>
          ) : null}
        </View>
        <View style={styles.rowActions}>
          <AppButton onPress={onEdit} title="Edit" variant="secondary" />
          <AppButton
            loading={archive.isPending || restore.isPending}
            onPress={handleArchiveToggle}
            title={category.isArchived ? "Restore" : "Archive"}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText tone={active ? "inverse" : "default"} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your categories. Please try again.";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  formCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },
  chips: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  section: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  rowCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  rowHeader: {
    gap: theme.spacing.md,
  },
  rowCopy: {
    gap: theme.spacing.xxs,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  error: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
});
