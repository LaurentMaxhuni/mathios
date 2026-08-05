"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import type { CourseRecord, LessonRecord, ModuleRecord } from "@/domain/course/types";
import type { GradeRecord, SubjectRecord } from "@/domain/curriculum/types";
import { saveCourseAction, saveLessonAction, saveModuleAction } from "@/features/courses/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useFormAction(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

function Textarea({
  id,
  name,
  defaultValue,
  required = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      rows={4}
      className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" aria-hidden="true" />
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function CourseForm({
  course,
  subjects,
  grades,
}: {
  course?: CourseRecord;
  subjects: readonly SubjectRecord[];
  grades: readonly GradeRecord[];
}) {
  const [state, formAction, pending] = useFormAction(saveCourseAction);
  return (
    <form action={formAction} className="space-y-5">
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="course-title">Title</Label>
          <Input id="course-title" name="title" defaultValue={course?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-slug">Slug</Label>
          <Input id="course-slug" name="slug" defaultValue={course?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-subject">Subject</Label>
          <select
            id="course-subject"
            name="subjectId"
            defaultValue={course?.subjectId ?? subjects[0]?.id}
            className="field-select"
            required
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-difficulty">Difficulty</Label>
          <select
            id="course-difficulty"
            name="difficulty"
            defaultValue={course?.difficulty ?? "balanced"}
            className="field-select"
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-duration">Estimated minutes</Label>
          <Input
            id="course-duration"
            name="estimatedDurationMinutes"
            type="number"
            min={0}
            defaultValue={course?.estimatedDurationMinutes ?? 60}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-grade-min">First grade</Label>
          <select
            id="course-grade-min"
            name="gradeMinId"
            defaultValue={course?.gradeMinId ?? ""}
            className="field-select"
          >
            <option value="">Not set</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="course-grade-max">Last grade</Label>
          <select
            id="course-grade-max"
            name="gradeMaxId"
            defaultValue={course?.gradeMaxId ?? ""}
            className="field-select"
          >
            <option value="">Not set</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="course-description">Description</Label>
          <Textarea id="course-description" name="description" defaultValue={course?.description} />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="isRequired"
          defaultChecked={course?.isRequired ?? false}
          className="h-4 w-4 rounded border-input"
        />
        Required course for the selected progression
      </label>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={course ? "Save course" : "Create course"} />
    </form>
  );
}

export function ModuleForm({ module, courseId }: { module?: ModuleRecord; courseId: string }) {
  const [state, formAction, pending] = useFormAction(saveModuleAction);
  return (
    <form action={formAction} className="space-y-4">
      {module ? <input type="hidden" name="id" value={module.id} /> : null}
      <input type="hidden" name="courseId" value={courseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`module-title-${module?.id ?? "new"}`}>Title</Label>
          <Input
            id={`module-title-${module?.id ?? "new"}`}
            name="title"
            defaultValue={module?.title}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`module-order-${module?.id ?? "new"}`}>Order</Label>
          <Input
            id={`module-order-${module?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={module?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`module-time-${module?.id ?? "new"}`}>Study minutes</Label>
          <Input
            id={`module-time-${module?.id ?? "new"}`}
            name="estimatedStudyTimeMinutes"
            type="number"
            min={0}
            defaultValue={module?.estimatedStudyTimeMinutes ?? 30}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`module-description-${module?.id ?? "new"}`}>Description</Label>
          <Textarea
            id={`module-description-${module?.id ?? "new"}`}
            name="description"
            defaultValue={module?.description}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`module-assessment-${module?.id ?? "new"}`}>Assessment reference</Label>
          <Input
            id={`module-assessment-${module?.id ?? "new"}`}
            name="assessmentReference"
            defaultValue={module?.assessmentReference ?? ""}
            placeholder="Optional Phase 6 assessment reference"
          />
        </div>
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={module ? "Save module" : "Add module"} />
    </form>
  );
}

export function LessonForm({ lesson, moduleId }: { lesson?: LessonRecord; moduleId: string }) {
  const [state, formAction, pending] = useFormAction(saveLessonAction);
  return (
    <form action={formAction} className="space-y-4">
      {lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`lesson-title-${lesson?.id ?? "new"}`}>Title</Label>
          <Input
            id={`lesson-title-${lesson?.id ?? "new"}`}
            name="title"
            defaultValue={lesson?.title}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lesson-slug-${lesson?.id ?? "new"}`}>Slug</Label>
          <Input
            id={`lesson-slug-${lesson?.id ?? "new"}`}
            name="slug"
            defaultValue={lesson?.slug}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lesson-order-${lesson?.id ?? "new"}`}>Order</Label>
          <Input
            id={`lesson-order-${lesson?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={lesson?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lesson-duration-${lesson?.id ?? "new"}`}>Minutes</Label>
          <Input
            id={`lesson-duration-${lesson?.id ?? "new"}`}
            name="estimatedDurationMinutes"
            type="number"
            min={0}
            defaultValue={lesson?.estimatedDurationMinutes ?? 20}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`lesson-summary-${lesson?.id ?? "new"}`}>Summary</Label>
          <Textarea
            id={`lesson-summary-${lesson?.id ?? "new"}`}
            name="summary"
            defaultValue={lesson?.summary}
          />
        </div>
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={lesson ? "Save lesson details" : "Add lesson"} />
    </form>
  );
}
