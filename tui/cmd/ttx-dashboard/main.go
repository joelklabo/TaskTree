package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type DashboardState struct {
	Status struct {
		Env       string `json:"env"`
		Ready     bool   `json:"ready"`
		UpdatedAt string `json:"updated_at"`
	} `json:"status"`
	Git struct {
		Branch string `json:"branch"`
		Ahead  int    `json:"ahead"`
		Behind int    `json:"behind"`
		Dirty  int    `json:"dirty"`
	} `json:"git"`
	Servers []struct {
		Name   string `json:"name"`
		Status bool   `json:"status"`
		Port   int    `json:"port"`
	} `json:"servers"`
	Alerts struct {
		Total      int    `json:"total"`
		RecentText string `json:"recent_text"`
		Recent []struct {
			Level  string `json:"level"`
			Msg    string `json:"msg"`
			Count  int    `json:"count"`
			Source string `json:"source"`
		} `json:"recent"`
	} `json:"alerts"`
	CI struct {
		Status     string `json:"status"`
		RecentText string `json:"recent_text"`
		Runs       []struct {
			Workflow   string `json:"workflow"`
			Status     string `json:"status"`
			Conclusion string `json:"conclusion"`
			Branch     string `json:"branch"`
			URL        string `json:"url"`
			UpdatedAt  string `json:"updated_at"`
		} `json:"runs"`
	} `json:"ci"`
	Traces struct {
		RecentRuns int `json:"recent_runs"`
	} `json:"traces"`
	Logs struct {
		ConfiguredSources int `json:"configured_sources"`
	} `json:"logs"`
}

type model struct {
	state DashboardState
	err   error
}

func initialModel(path string) model {
	data, err := os.ReadFile(path)
	if err != nil {
		return model{err: err}
	}
	var st DashboardState
	if err := json.Unmarshal(data, &st); err != nil {
		return model{err: err}
	}
	return model{state: st}
}

func (m model) Init() tea.Cmd { return nil }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if msg.String() == "ctrl+c" || msg.String() == "q" {
			return m, tea.Quit
		}
	}
	return m, nil
}

var (
	titleStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#89b4fa")).Bold(true)
	labelStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#cdd6f4"))
	valueStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#a6adc8"))
	cardStyle   = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).Padding(0, 1).BorderForeground(lipgloss.Color("#6c7086"))
	errorStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#f38ba8")).Bold(true)
	headerStyle = lipgloss.NewStyle().Bold(true)
)

func (m model) View() string {
	if m.err != nil {
		return errorStyle.Render(fmt.Sprintf("state error: %v", m.err))
	}
	var lines []string
	updated := m.state.Status.UpdatedAt
	if updated == "" {
		updated = time.Now().Format(time.RFC3339)
	}
	lines = append(lines, titleStyle.Render(fmt.Sprintf("TaskTree Dashboard — %s", updated)))

	sections := []string{
		cardStyle.Render(
			headerStyle.Render("Status") + "\n" +
				labelStyle.Render(fmt.Sprintf("Env: ")) + valueStyle.Render(m.state.Status.Env) + "\n" +
				labelStyle.Render("Ready: ") + valueStyle.Render(fmt.Sprintf("%v", m.state.Status.Ready)),
		),
		cardStyle.Render(
			headerStyle.Render("Git") + "\n" +
				labelStyle.Render("Branch: ")+valueStyle.Render(m.state.Git.Branch)+"\n"+
				labelStyle.Render("Ahead/Behind/Dirty: ")+valueStyle.Render(
					fmt.Sprintf("%d/%d/%d", m.state.Git.Ahead, m.state.Git.Behind, m.state.Git.Dirty)),
		),
		cardStyle.Render(
			headerStyle.Render("Servers") + "\n" + renderServers(m.state.Servers),
		),
		cardStyle.Render(
			headerStyle.Render("Alerts") + "\n" +
				labelStyle.Render("Total: ")+valueStyle.Render(fmt.Sprintf("%d", m.state.Alerts.Total))+"\n"+
				renderAlerts(m.state.Alerts.Recent, m.state.Alerts.RecentText),
		),
		cardStyle.Render(
			headerStyle.Render("CI") + "\n" + renderCI(m.state.CI),
		),
		cardStyle.Render(
			headerStyle.Render("Traces") + "\n" +
				labelStyle.Render("Recent runs: ")+valueStyle.Render(fmt.Sprintf("%d", m.state.Traces.RecentRuns)),
		),
		cardStyle.Render(
			headerStyle.Render("Logs") + "\n" +
				labelStyle.Render("Sources: ")+valueStyle.Render(fmt.Sprintf("%d", m.state.Logs.ConfiguredSources)),
		),
	}
	lines = append(lines, lipgloss.JoinHorizontal(lipgloss.Top, sections...))
	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}

func renderServers(servers []struct {
	Name   string `json:"name"`
	Status bool   `json:"status"`
	Port   int    `json:"port"`
}) string {
	if len(servers) == 0 {
		return valueStyle.Render("none")
	}
	out := ""
	for _, s := range servers {
		state := "down"
		if s.Status {
			state = "up"
		}
		out += fmt.Sprintf("%s: %s :%d\n", s.Name, state, s.Port)
	}
	return out
}

func renderAlerts(alerts []struct {
	Level  string `json:"level"`
	Msg    string `json:"msg"`
	Count  int    `json:"count"`
	Source string `json:"source"`
}, recentText string) string {
	out := ""
	if recentText != "" {
		out += valueStyle.Render(recentText)
		out += "\n"
	}
	if len(alerts) == 0 {
		out += valueStyle.Render("no recent")
		return out
	}
	for _, a := range alerts {
		out += fmt.Sprintf("[%s] %s\n", a.Level, a.Msg)
	}
	return out
}

func renderCI(ci struct {
	Status     string `json:"status"`
	RecentText string `json:"recent_text"`
	Runs       []struct {
		Workflow   string `json:"workflow"`
		Status     string `json:"status"`
		Conclusion string `json:"conclusion"`
		Branch     string `json:"branch"`
		URL        string `json:"url"`
		UpdatedAt  string `json:"updated_at"`
	} `json:"runs"`
}) string {
	out := valueStyle.Render(fmt.Sprintf("Status: %s", ci.Status))
	if len(ci.Runs) > 0 {
		out += "\n"
		for _, r := range ci.Runs {
			out += fmt.Sprintf("%s %s (%s) %s\n", r.Workflow, r.Conclusion, r.Branch, r.URL)
		}
	}
	// Only show recent_text when there are no runs (avoid stale smoke cache mixed with live runs).
	if len(ci.Runs) == 0 && ci.RecentText != "" {
		out += valueStyle.Render(ci.RecentText)
	}
	return out
}

func main() {
	path := os.Getenv("DASHBOARD_STATE")
	if path == "" {
		path = "tmp/dashboard_state.json"
	}
	p := tea.NewProgram(initialModel(path))
	if _, err := p.Run(); err != nil {
		fmt.Printf("error: %v\n", err)
		os.Exit(1)
	}
}
