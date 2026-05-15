import type { WorkflowPlan, WorkflowStep } from '../shared/workflow';
import { ActionExecutor } from './actionExecutor';

interface WorkflowRunnerDelegate {
  onWorkflowProgress(goal: string, currentStepDescription: string): void;
  onWorkflowFinished(): void;
  onWorkflowError(error: Error): void;
}

export class WorkflowRunner {
  private readonly actionExecutor = new ActionExecutor();

  constructor(private readonly delegate: WorkflowRunnerDelegate) {}

  async runWorkflowPlan(workflowPlan: WorkflowPlan, isAutopilotEnabled: boolean): Promise<void> {
    this.delegate.onWorkflowProgress(workflowPlan.goal, 'Starting workflow');

    for (const workflowStep of workflowPlan.steps) {
      this.delegate.onWorkflowProgress(workflowPlan.goal, this.describeWorkflowStep(workflowStep));

      if (isAutopilotEnabled) {
        await this.actionExecutor.executeWorkflowStep(workflowStep);
      }
    }

    this.delegate.onWorkflowFinished();
  }

  private describeWorkflowStep(workflowStep: WorkflowStep): string {
    if (workflowStep.label) {
      return `${workflowStep.type}: ${workflowStep.label}`;
    }

    if (workflowStep.value) {
      return `${workflowStep.type}: ${workflowStep.value}`;
    }

    return workflowStep.type;
  }
}
