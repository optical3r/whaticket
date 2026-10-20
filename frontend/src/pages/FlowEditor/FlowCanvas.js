import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
	Background,
	Controls,
	Handle,
	MarkerType,
	MiniMap,
	Panel,
	Position,
	ReactFlow,
	applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { makeStyles } from "tss-react/mui";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

import { i18n } from "../../translate/i18n";
import { MAX_STEPS } from "./flowLogic";

const NODE_WIDTH = 260;

const useStyles = makeStyles()(theme => ({
	root: {
		width: "100%",
		height: "100%",
		minHeight: 420,
		borderRadius: theme.borderRadius.medium,
		border: theme.border.divider,
		overflow: "hidden",
		backgroundColor: theme.palette.background.default,
		"& .react-flow": {
			"--xy-background-color": theme.palette.background.default,
			"--xy-controls-button-background-color": theme.palette.background.paper,
			"--xy-controls-button-color": theme.palette.text.primary,
			"--xy-controls-button-border-color": theme.palette.divider,
			"--xy-attribution-background-color": "transparent",
		},
		"& .react-flow__controls-button": {
			width: 32,
			height: 32,
		},
	},
	toolbar: {
		display: "flex",
		gap: theme.spacing(1),
		flexWrap: "wrap",
	},
	toolbarButton: {
		backgroundColor: theme.palette.background.paper,
		"&:hover": {
			backgroundColor: theme.palette.background.paper,
		},
	},
	node: {
		width: NODE_WIDTH,
		borderRadius: theme.borderRadius.medium,
		border: `1px solid ${theme.palette.border.strong}`,
		backgroundColor: theme.palette.background.paper,
		color: theme.palette.text.primary,
		boxShadow: theme.elevation.light,
		fontSize: 14,
		lineHeight: 1.45,
	},
	selected: {
		borderColor: theme.palette.primary.main,
		boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
	},
	problem: {
		borderColor: theme.palette.error.main,
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		padding: theme.spacing(1, 1.5),
		borderBottom: theme.border.divider,
	},
	title: {
		fontWeight: 600,
		flex: 1,
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	stepId: {
		fontFamily: theme.typography.monoFontFamily,
		fontSize: 12,
		color: theme.palette.text.secondary,
	},
	start: {
		fontSize: 12,
		fontWeight: 600,
		padding: "1px 8px",
		borderRadius: theme.borderRadius.pill,
		backgroundColor: theme.palette.primary.main,
		color: theme.palette.primary.contrastText,
	},
	body: {
		padding: theme.spacing(1, 1.5),
	},
	text: {
		display: "-webkit-box",
		WebkitLineClamp: 3,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
	},
	muted: {
		color: theme.palette.text.secondary,
	},
	exit: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		padding: theme.spacing(0.75, 1.5),
		borderTop: theme.border.divider,
	},
	exitNumber: {
		fontFamily: theme.typography.monoFontFamily,
		color: theme.palette.text.secondary,
	},
	exitLabel: {
		flex: 1,
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	handle: {
		width: 12,
		height: 12,
		border: `2px solid ${theme.palette.background.paper}`,
		backgroundColor: theme.palette.primary.main,
	},
	targetHandle: {
		width: 12,
		height: 12,
		border: `2px solid ${theme.palette.background.paper}`,
		backgroundColor: theme.palette.text.secondary,
	},
}));

// One step on the board. Its exits are the dots on the right: drag from a
// dot to another step to link them.
const StepNode = memo(function StepNode({ data, selected }) {
	const { classes, cx } = useStyles();
	const { step, index, isStart, problem, queueName } = data;
	const label = i18n.t(`flowEditor.types.${step.type}`);

	const exitHandle = id => <Handle type="source" position={Position.Right} id={id} className={classes.handle} />;

	return (
		<div
			className={cx(classes.node, selected && classes.selected, problem && !selected && classes.problem)}
			data-testid={`flow-node-${step.id}`}
		>
			<Handle type="target" position={Position.Left} id="in" className={classes.targetHandle} />
			<div className={classes.header}>
				<span className={classes.title}>
					{index + 1}. {label}
				</span>
				{isStart && <span className={classes.start}>{i18n.t("flowEditor.startTag")}</span>}
				<span className={classes.stepId}>{step.id}</span>
			</div>
			<div className={classes.body}>
				{step.text.trim() ? (
					<div className={classes.text}>{step.text}</div>
				) : (
					<div className={classes.muted}>{i18n.t("flowEditor.board.noText")}</div>
				)}
				{step.type === "queue" && (
					<div className={classes.muted}>
						{queueName ? i18n.t("flowEditor.board.toQueue", { queue: queueName }) : i18n.t("flowEditor.board.noQueue")}
					</div>
				)}
				{step.type === "close" && <div className={classes.muted}>{i18n.t("flowEditor.board.closes")}</div>}
				{step.type === "question" && step.field && (
					<div className={classes.muted}>{i18n.t("flowEditor.board.savesAs", { field: step.field })}</div>
				)}
			</div>
			{step.type === "menu" &&
				step.options.map((option, position) => (
					// eslint-disable-next-line react/no-array-index-key
					<div className={classes.exit} key={position}>
						<span className={classes.exitNumber}>{position + 1}</span>
						<span className={classes.exitLabel}>{option.label || i18n.t("flowEditor.board.noLabel")}</span>
						{exitHandle(`opt-${position}`)}
					</div>
				))}
			{(step.type === "message" || step.type === "question") && (
				<div className={classes.exit}>
					<span className={cx(classes.exitLabel, classes.muted)}>
						{step.next ? i18n.t("flowEditor.board.then") : i18n.t("flowEditor.board.ends")}
					</span>
					{exitHandle("next")}
				</div>
			)}
		</div>
	);
});

const nodeTypes = { step: StepNode };

const FlowCanvas = ({
	definition,
	queues,
	problems,
	showErrors,
	selectedId,
	onSelect,
	onMove,
	onLink,
	onUnlink,
	onAdd,
	onRemove,
	onOrganize,
}) => {
	const { classes } = useStyles();
	const theme = useTheme();
	// On small screens the overview would cover most of the board.
	const wide = useMediaQuery(theme.breakpoints.up("md"));
	const wrapper = useRef(null);
	const instance = useRef(null);
	const [nodes, setNodes] = useState([]);
	const [selectedEdge, setSelectedEdge] = useState(null);

	// The board keeps its own copy of the nodes so dragging stays smooth and
	// sizes measured by React Flow are kept; the definition is the source of
	// everything else.
	useEffect(() => {
		setNodes(previous => {
			const byId = new Map(previous.map(node => [node.id, node]));
			return definition.steps.map((step, index) => {
				const old = byId.get(step.id);
				return {
					...(old || {}),
					id: step.id,
					type: "step",
					position: old && old.dragging ? old.position : step.position || { x: 0, y: 0 },
					selected: step.id === selectedId,
					data: {
						step,
						index,
						isStart: definition.startId === step.id,
						problem: showErrors && problems[index],
						queueName: queues.find(queue => queue.id === Number(step.queueId))?.name,
					},
				};
			});
		});
	}, [definition, selectedId, problems, showErrors, queues]);

	const edges = useMemo(() => {
		const edge = (id, source, sourceHandle, target, label) => {
			const selected = id === selectedEdge;
			const stroke = selected ? theme.palette.primary.main : theme.palette.text.secondary;
			return {
				id,
				source,
				sourceHandle,
				target,
				targetHandle: "in",
				label,
				selected,
				style: { stroke, strokeWidth: selected ? 3 : 2 },
				labelStyle: {
					fill: theme.palette.text.primary,
					fontSize: 12,
					fontWeight: 600,
				},
				labelBgStyle: { fill: theme.palette.background.paper },
				markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
			};
		};
		const ids = new Set(definition.steps.map(step => step.id));
		const list = [];
		definition.steps.forEach(step => {
			if ((step.type === "message" || step.type === "question") && step.next && ids.has(step.next)) {
				list.push(edge(`${step.id}:next`, step.id, "next", step.next));
			}
			if (step.type === "menu") {
				step.options.forEach((option, position) => {
					if (option.next && ids.has(option.next)) {
						list.push(
							edge(`${step.id}:opt-${position}`, step.id, `opt-${position}`, option.next, String(position + 1)),
						);
					}
				});
			}
		});
		return list;
	}, [definition, theme, selectedEdge]);

	const addAtCenter = () => {
		let position = { x: 0, y: 0 };
		if (wrapper.current && instance.current) {
			const rect = wrapper.current.getBoundingClientRect();
			position = instance.current.screenToFlowPosition({
				x: rect.left + rect.width / 2 - NODE_WIDTH / 2,
				y: rect.top + rect.height / 3,
			});
		}
		onAdd({ x: Math.round(position.x), y: Math.round(position.y) });
	};

	return (
		<div className={classes.root} ref={wrapper}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				colorMode={theme.palette.mode}
				onInit={flow => {
					instance.current = flow;
				}}
				onNodesChange={changes =>
					setNodes(current =>
						applyNodeChanges(
							changes.filter(change => change.type !== "remove" && change.type !== "select"),
							current,
						),
					)
				}
				onEdgesChange={changes =>
					changes.forEach(change => {
						if (change.type === "select") {
							setSelectedEdge(previous => (change.selected ? change.id : previous === change.id ? null : previous));
						}
					})
				}
				onNodeDragStop={(event, node) => onMove(node.id, node.position)}
				onNodeClick={(event, node) => onSelect(node.id)}
				onPaneClick={() => onSelect(null)}
				onConnect={({ source, sourceHandle, target }) => {
					if (source !== target) onLink(source, sourceHandle, target);
				}}
				onEdgesDelete={removed => removed.forEach(edge => onUnlink(edge.source, edge.sourceHandle))}
				onNodesDelete={removed => removed.forEach(node => onRemove(node.id))}
				deleteKeyCode={["Delete", "Backspace"]}
				attributionPosition="top-right"
				fitView
				fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
				minZoom={0.2}
				maxZoom={1.5}
			>
				<Background color={theme.palette.divider} gap={24} size={2} />
				<Controls showInteractive={false} position="bottom-left" />
				{wide && (
					<MiniMap
						pannable
						zoomable
						position="bottom-right"
						nodeColor={theme.palette.divider}
						maskColor={theme.palette.mode === "dark" ? "rgba(7, 11, 18, 0.6)" : "rgba(243, 246, 250, 0.7)"}
						style={{ backgroundColor: theme.palette.background.paper }}
						ariaLabel={i18n.t("flowEditor.board.minimap")}
					/>
				)}
				<Panel position="top-left">
					<div className={classes.toolbar}>
						<Button
							variant="outlined"
							size="small"
							startIcon={<AddIcon />}
							className={classes.toolbarButton}
							disabled={definition.steps.length >= MAX_STEPS}
							onClick={addAtCenter}
						>
							{i18n.t("flowEditor.addStep")}
						</Button>
						<Button
							variant="outlined"
							size="small"
							startIcon={<AccountTreeOutlinedIcon />}
							className={classes.toolbarButton}
							onClick={onOrganize}
						>
							{i18n.t("flowEditor.board.organize")}
						</Button>
					</div>
				</Panel>
			</ReactFlow>
		</div>
	);
};

export default FlowCanvas;
