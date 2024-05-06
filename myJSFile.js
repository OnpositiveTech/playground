import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Loader, Button } from '@gravity-ui/uikit';

import { FileXmark } from '@gravity-ui/icons';

import type { ICommitMeta, IFileMeta } from 'shared/types/data/gitcore';
import { block } from '@/lib/utils/cn';
import { useAppSettings } from '@/lib/common/appSettings';
import { YfmDocument } from '@/components/YfmDocument';
import { CodeFile } from '../../deps';
import { useRepoNavigation } from '../../hooks/useRepoNavigation';
import { useFileContent } from '../../hooks/useFileContent';
import { usePathMeta } from '../../hooks/usePathMeta';
import { buildFileUrl } from '../../utils/fileContent';
import { detectFileLanguage } from '../../utils/detectFileLanguage';
import { getAbsolutePath } from '../../utils/path';
import { FilePageLayout } from '../FilePageLayout';
import { PathRevisionInfo } from '../PathRevisionInfo';
import { FileHeader } from '../FileHeader';
import cssfrom './RepoFile.module.css';

const cn= block('RepoFile');
interface IFileDisplayProps {
    fileMeta: IFileMeta;
    rev: string;
    owner: string;
    repo: string;
}

const supportedBinaryType = {
    IMAGE: 'image',
};

// FIXME(pistch): Need some way to display images/videos/whatever
function BinaryFile(props: IFileDisplayProps) {
    const { fileMeta, rev, owner, repo } = props;
    const binaryFileUrl = buildFileUrl({
        rev,
        repo,
        owner,
        path: fileMeta.path,
    });

    return <img src={binaryFileUrl} alt={fileMeta.name} />;
}

function UnsupportedFile(props: IFileDisplayProps) {
    const { fileMeta, rev, owner, repo } = props;
    const binaryFileUrl = buildFileUrl({
        rev,
        repo,
        owner,
        path: fileMeta.path,
    });

    return (
        <div className={cn('File', [css.fileWrapper])}>
            <div>
                <FileXmark width={32} height={32} />
            </div>
            <div>Unsupported file</div>
            <Button
                view="raised"
                size="l"
                href={binaryFileUrl}
                className={cn('File', [css.download])}
            >
                Download ({fileMeta.fileMetadata.size} bytes)
            </Button>
        </div>
    );
}

function TextFile(props: IFileDisplayProps) {
    const { content } = useFileContent(props);

    if (typeof content !== 'string') {
        return null;
    }

    return (
        <Suspense>
            <CodeFile
                content={content}
                className={cn('Code', [css.code])}
                lang={detectFileLanguage(props.fileMeta.path)}
            />
        </Suspense>
    );
}

export function YfmFile(props: IFileDisplayProps) {
    const { owner, repo, fileMeta, rev } = props;
    const { content, isLoading } = useFileContent(props);
    const [dirPath] = useMemo(() => {
        const lastSlashPosition = fileMeta.path.lastIndexOf('/');

        if (lastSlashPosition < 0) {
            return ['', fileMeta.path];
        }

        return [
            fileMeta.path.slice(0, lastSlashPosition),
            fileMeta.path.slice(lastSlashPosition + 1),
        ];
    }, [fileMeta.path]);
    const formatImageLink = useCallback(
        (imagePath: string) => {
            return buildFileUrl({
                rev,
                repo,
                owner,
                path: getAbsolutePath(dirPath, imagePath),
            });
        },
        [rev, owner, repo, dirPath],
    );

    if (isLoading || !content) {
        return null;
    }

    return (
        <Suspense>
            <YfmDocument
                value={content as string}
                formatImageLink={formatImageLink}
                className={cn('YFM', [css.yfm])}
            />
        </Suspense>
    );
}

interface IPathRevisionInfoContainerProps {
    lastCommit: ICommitMeta;
    onRevChange: (newRev: string) => void;
}

function PathRevisionInfoContainer(props: IPathRevisionInfoContainerProps) {
    const { onRevChange } = props;
    const [currentRev, setCurrentRev] = useState<string>(props.lastCommit.hash);
    const handleRevChange = useCallback(
        (newRev: string) => {
            setCurrentRev(newRev);
            onRevChange(newRev);
        },
        [setCurrentRev, onRevChange],
    );

    return <PathRevisionInfo rev={currentRev} setRev={handleRevChange} />;
}

function getDisplayComponent(fileMeta: IFileMeta | null) {
    if (!fileMeta) {
        // eslint-disable-next-line react/display-name
        return () => <Loader size="m" />;
    }

    if (fileMeta.fileMetadata.isBinary) {
        if (fileMeta.fileMetadata.mimetype.includes(supportedBinaryType.IMAGE)) {
            return BinaryFile;
        }

        return UnsupportedFile;
    }

    if (fileMeta.path.toLowerCase().endsWith('.md')) {
        return YfmFile;
    }

    return TextFile;
}

export interface IRepoFileProps {
    className?: string;
    path?: string;

    hideLastCommit?: boolean;
}

export function RepoFile(props: IRepoFileProps) {
    const { className, hideLastCommit } = props;
    const navigationParams = useRepoNavigation();
    const { isTreeNavigation } = useAppSettings();
    const { owner, repo, path, rev } = {
        ...navigationParams,
        ...props,
    };
    const [currentRev, setCurrentRev] = useState<string>(rev);

    const { entity: fileMeta } = usePathMeta(path);

    const DisplayComponent = getDisplayComponent(fileMeta);

    return (
        <FilePageLayout
            className={cn(null, [
                css.wrapper,
                isTreeNavigation ? css.treeNavigation : undefined,
                className,
            ])}
        >
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

<FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
            {!hideLastCommit && fileMeta?.lastCommit && (
                <PathRevisionInfoContainer
                    lastCommit={fileMeta.lastCommit}
                    onRevChange={setCurrentRev}
                />
            )}

            <FilePageLayout.Title>
                <FileHeader path={path} />
            </FilePageLayout.Title>
            <FilePageLayout.Content>
                {fileMeta && currentRev ? (
                    <DisplayComponent
                        key={fileMeta.lastCommit.hash + fileMeta.path}
                        fileMeta={fileMeta}
                        rev={currentRev}
                        owner={owner}
                        repo={repo}
                    />
                ) : (
                    <Loader size="m" />
                )}
            </FilePageLayout.Content>
        </FilePageLayout>
    );
}
